/**
 * "Plata actual": todo automático. Se toma la última compra mayorista (pestaña
 * Compras) y se suman las ventas cobradas desde ese día, separadas según cómo
 * pagó cada cliente (transferencia, efectivo o Mercado Pago). Cuando se carga
 * una compra nueva, el contador arranca de nuevo desde esa fecha.
 */
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

/** "2026-10-26" o "2026-11-04 17:05" → Date local (null si no se puede leer). */
function fechaDe(v: unknown): Date | null {
  const s = String(v ?? "").trim();
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0));
}

/**
 * ¿El pedido está cobrado? Manda lo que se marca en el CRM: "sí" suma, "no" NO
 * suma nunca (aunque el estado diga "pagado"). Solo si está vacío se toma el
 * estado "pagado" (pagos aprobados por la web / Mercado Pago).
 */
export function pedidoCobrado(r: Fila): boolean {
  const c = String(r.cobrado ?? "").trim().toLowerCase();
  if (c === "sí" || c === "si") return true;
  if (c === "no") return false;
  return String(r.estado ?? "").trim().toLowerCase() === "pagado";
}

export interface ResultadoCaja {
  /** Última compra mayorista (desde ese día se cuentan las ventas). null = no hay compras. */
  desde: { fecha: Date; proveedor: string } | null;
  porMedio: Record<Medio, number>;
  /** Pedidos que suman en cada lado (del más nuevo al más viejo). */
  pedidosPorMedio: Record<Medio, Fila[]>;
  total: number;
  nVentas: number;
  /** Ventas cobradas sin forma de pago: no se pueden ubicar en ningún lado. */
  sinMedio: { n: number; monto: number };
}

export function calcularCaja(pedidos: Fila[], compras: Fila[]): ResultadoCaja {
  // Última compra: la de fecha más nueva (desde el comienzo de ese día).
  let desde: ResultadoCaja["desde"] = null;
  for (const c of compras) {
    const f = fechaDe(c.fecha);
    if (!f || num(c.total) <= 0) continue;
    const dia = new Date(f.getFullYear(), f.getMonth(), f.getDate());
    if (!desde || dia > desde.fecha) desde = { fecha: dia, proveedor: String(c.proveedor ?? "").trim() };
  }
  const porMedio: Record<Medio, number> = { efectivo: 0, transferencia: 0, mercadopago: 0 };
  const pedidosPorMedio: Record<Medio, Fila[]> = { efectivo: [], transferencia: [], mercadopago: [] };
  let nVentas = 0;
  const sinMedio = { n: 0, monto: 0 };
  for (const r of pedidos) {
    if (!pedidoCobrado(r)) continue;
    const f = fechaDe(r.fecha);
    if (!f || (desde && f < desde.fecha)) continue;
    const monto = num(r.monto);
    if (monto <= 0) continue;
    const m = medioDe(r.pago);
    if (!m) {
      sinMedio.n++;
      sinMedio.monto += monto;
      continue;
    }
    porMedio[m] += monto;
    pedidosPorMedio[m].push(r);
    nVentas++;
  }
  for (const k of Object.keys(pedidosPorMedio) as Medio[]) {
    pedidosPorMedio[k].sort((a, b) => (fechaDe(b.fecha)?.getTime() ?? 0) - (fechaDe(a.fecha)?.getTime() ?? 0));
  }
  return { desde, porMedio, pedidosPorMedio, total: porMedio.efectivo + porMedio.transferencia + porMedio.mercadopago, nVentas, sinMedio };
}
