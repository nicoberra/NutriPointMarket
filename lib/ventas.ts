// Ventas por producto para el CRM: cuántas unidades se vendieron de cada
// producto y quién las compró, a partir de la pestaña Pedidos (items en JSON).
import { useEffect, useState } from "react";
import { ensureTable, peekTable, subscribeTable } from "./tableCache";

type Row = Record<string, string>;

export interface CompraDeProducto {
  pedido: string;
  cliente: string;
  telefono: string;
  fecha: string;
  unidades: number;
  variante: string;
  web: boolean;
}

export interface VentasProducto {
  unidades: number;
  porVariante: Record<string, number>;
  compras: CompraDeProducto[];
}

const clave = (s: unknown) => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/** Arma el mapa nombre del producto (normalizado) → ventas. */
export function calcularVentas(pedidos: Row[], porCaja: (nombre: string) => number): Map<string, VentasProducto> {
  const mapa = new Map<string, VentasProducto>();
  for (const p of pedidos) {
    let items: { n?: string; q?: number; v?: string; caja?: boolean }[] = [];
    try {
      items = JSON.parse(p.items || "[]");
    } catch {
      continue;
    }
    if (!Array.isArray(items)) continue;
    for (const it of items) {
      const k = clave(it.n);
      if (!k) continue;
      const unidades = (Number(it.q) || 0) * (it.caja ? Math.max(1, porCaja(String(it.n))) : 1);
      if (unidades <= 0) continue;
      const v = mapa.get(k) ?? { unidades: 0, porVariante: {}, compras: [] };
      v.unidades += unidades;
      const variante = String(it.v ?? "").trim();
      if (variante) v.porVariante[variante] = (v.porVariante[variante] ?? 0) + unidades;
      v.compras.push({
        pedido: String(p.id ?? ""),
        cliente: String(p.cliente ?? "").trim() || "Sin nombre",
        telefono: String(p.telefono ?? ""),
        fecha: String(p.fecha ?? ""),
        unidades,
        variante,
        web: /^ped\d/.test(String(p.id ?? "")),
      });
      mapa.set(k, v);
    }
  }
  // Lo más nuevo arriba.
  mapa.forEach((v) => v.compras.sort((a, b) => b.fecha.localeCompare(a.fecha)));
  return mapa;
}

/** Hook: ventas de todos los productos, se actualiza solo cuando cambian los pedidos. */
export function useVentasPorProducto(porCaja: (nombre: string) => number): (nombre: string) => VentasProducto | undefined {
  const [pedidos, setPedidos] = useState<Row[]>(() => peekTable<Row>("Pedidos") ?? []);
  useEffect(() => {
    const un = subscribeTable("Pedidos", (rows) => setPedidos(rows as Row[]));
    ensureTable<Row>("Pedidos").then(setPedidos).catch(() => {});
    return un;
  }, []);
  const [mapa, setMapa] = useState<Map<string, VentasProducto>>(new Map());
  useEffect(() => {
    setMapa(calcularVentas(pedidos, porCaja));
    // porCaja cambia de identidad en cada render; alcanza con recalcular al cambiar los pedidos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidos]);
  return (nombre: string) => mapa.get(clave(nombre));
}
