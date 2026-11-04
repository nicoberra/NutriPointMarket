/**
 * Cupón del regalo guardado en este navegador: lo deja la página /regalo (o un
 * link con ?cupon=) y el checkout lo carga solo. El descuento real lo calcula y
 * valida el servidor al crear el pedido; acá solo se muestra.
 */
import { formatPrice } from "@/lib/format";

export interface CuponGuardado {
  codigo: string;
  tipo: "monto" | "porcentaje";
  valor: number;
}

const KEY = "sm-cupon-v1";
const CODIGO = /^SUPLE-[A-Z0-9]{6}$/;

export function normalizarCodigo(v: string): string {
  return v.trim().toUpperCase().replace(/\s+/g, "");
}

export function esCodigoValido(v: string): boolean {
  return CODIGO.test(normalizarCodigo(v));
}

export function leerCupon(): CuponGuardado | null {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "null") as CuponGuardado | null;
    return c && esCodigoValido(c.codigo) ? c : null;
  } catch {
    return null;
  }
}

export function guardarCupon(c: CuponGuardado | null): void {
  try {
    if (c) localStorage.setItem(KEY, JSON.stringify({ ...c, codigo: normalizarCodigo(c.codigo) }));
    else localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento: el cliente lo escribe a mano en el checkout */
  }
}

/** Descuento del cupón sobre el importe de los productos (mismo cálculo que el servidor). */
export function descuentoCupon(c: Pick<CuponGuardado, "tipo" | "valor">, base: number): number {
  if (base <= 0 || c.valor <= 0) return 0;
  const d = c.tipo === "porcentaje" ? Math.round((base * c.valor) / 100) : c.valor;
  return Math.min(d, base);
}

/** "$ 3.000 de descuento" / "10% OFF". */
export function textoRegalo(c: Pick<CuponGuardado, "tipo" | "valor">): string {
  return c.tipo === "porcentaje" ? `${c.valor}% OFF` : `${formatPrice(c.valor)} de descuento`;
}
