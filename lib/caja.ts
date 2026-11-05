/**
 * "Plata que deberías tener": saldo inicial por medio de pago + ventas cobradas
 * − compras, contando solo lo cargado después de fijar el saldo.
 */
import type { CajaConfig } from "@/lib/api";

export type Medio = "efectivo" | "transferencia" | "mercadopago";
export const MEDIOS: { id: Medio; label: string }[] = [
  { id: "transferencia", label: "Transferencia" },
  { id: "efectivo", label: "Efectivo" },
  { id: "mercadopago", label: "Mercado Pago" },
];

type Fila = Record<string, unknown>;

export function medioDe(pago: unknown): Medio | null {
  const p = String(pago ?? "").trim().toLowerCase();
  if (p.startsWith("efect")) return "efectivo";
  if (p.startsWith("transf")) return "transferencia";
  if (p.startsWith("mercado")) return "mercadopago";
  return null;
}

function num(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Momento en que se cargó la fila: el id lleva la hora (id/ped + ms); si no, la fecha. */
export function cargadoEn(r: Fila): number {
  const m = String(r.id ?? "").match(/^(?:id|ped)(\d{13})/);
  if (m) return Number(m[1]);
  const d = Date.parse(String(r.fecha ?? "").trim().replace(" ", "T"));
  return Number.isFinite(d) ? d : 0;
}

export function pedidoCobrado(r: Fila): boolean {
  return String(r.cobrado ?? "").trim().toLowerCase() === "sí" || String(r.estado ?? "").trim().toLowerCase() === "pagado";
}

export interface ResultadoCaja {
  saldo: Record<Medio, number>;
  total: number;
  ventas: Record<Medio, number>;
  compras: Record<Medio, number>;
  nVentas: number;
  nCompras: number;
  /** Compras cargadas sin forma de pago (o "Otro"): no se restaron. */
  comprasSinMedio: { n: number; monto: number };
  /** Ventas cobradas sin medio reconocido: no se sumaron. */
  ventasSinMedio: { n: number; monto: number };
}

const cero = (): Record<Medio, number> => ({ efectivo: 0, transferencia: 0, mercadopago: 0 });

export function calcularCaja(cfg: CajaConfig, pedidos: Fila[], compras: Fila[]): ResultadoCaja {
  const ventas = cero();
  const gastos = cero();
  let nVentas = 0;
  let nCompras = 0;
  const comprasSinMedio = { n: 0, monto: 0 };
  const ventasSinMedio = { n: 0, monto: 0 };
  const pendientes = new Set(cfg.pendientes);
  for (const r of pedidos) {
    if (!pedidoCobrado(r)) continue;
    if (!(cargadoEn(r) > cfg.desde || pendientes.has(String(r.id ?? "")))) continue;
    const monto = num(r.monto);
    if (monto <= 0) continue;
    const m = medioDe(r.pago);
    if (!m) { ventasSinMedio.n++; ventasSinMedio.monto += monto; continue; }
    ventas[m] += monto;
    nVentas++;
  }
  for (const r of compras) {
    if (!(cargadoEn(r) > cfg.desde)) continue;
    const monto = num(r.total);
    if (monto <= 0) continue;
    const m = medioDe(r.pago);
    if (!m) { comprasSinMedio.n++; comprasSinMedio.monto += monto; continue; }
    gastos[m] += monto;
    nCompras++;
  }
  const saldo = cero();
  for (const { id } of MEDIOS) saldo[id] = Math.round((cfg[id] + ventas[id] - gastos[id]) * 100) / 100;
  return {
    saldo,
    total: Math.round((saldo.efectivo + saldo.transferencia + saldo.mercadopago) * 100) / 100,
    ventas,
    compras: gastos,
    nVentas,
    nCompras,
    comprasSinMedio,
    ventasSinMedio,
  };
}
