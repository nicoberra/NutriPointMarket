"use client";

import { useEffect, useMemo, useState } from "react";
import { peekTable, ensureTable, subscribeTable } from "@/lib/tableCache";
import { calcularCaja, MEDIOS } from "@/lib/caja";
import { formatPrice } from "@/lib/format";

type Fila = Record<string, unknown>;

function ddmm(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Facturación · Plata actual: automática. Ventas cobradas desde la última
 * compra mayorista, separadas por cómo pagó cada cliente. No se carga nada.
 */
export function CajaPanel() {
  const [pedidos, setPedidos] = useState<Fila[] | null>(() => peekTable<Fila>("Pedidos"));
  const [compras, setCompras] = useState<Fila[] | null>(() => peekTable<Fila>("Compras"));

  useEffect(() => {
    const u1 = subscribeTable("Pedidos", setPedidos);
    const u2 = subscribeTable("Compras", setCompras);
    ensureTable<Fila>("Pedidos").then(setPedidos).catch(() => {});
    ensureTable<Fila>("Compras").then(setCompras).catch(() => {});
    return () => {
      u1();
      u2();
    };
  }, []);

  const res = useMemo(() => (pedidos && compras ? calcularCaja(pedidos, compras) : null), [pedidos, compras]);

  return (
    <section className="rounded-2xl border border-line bg-white p-5" aria-busy={!res}>
      <p className="text-sm font-bold text-ink">💵 Plata actual</p>
      {!res ? (
        <div className="mt-2 h-9 w-48 animate-pulse rounded-lg bg-page-soft motion-reduce:animate-none" />
      ) : (
        <>
          <p className="mt-1 font-display text-3xl font-black text-primary">{formatPrice(res.total)}</p>
          <p className="mt-1 text-xs text-muted">
            {res.desde
              ? `Ventas cobradas desde la última compra mayorista (${res.desde.proveedor || "compra"}, ${ddmm(res.desde.fecha)}) · ${res.nVentas} ${res.nVentas === 1 ? "venta" : "ventas"}`
              : `Ventas cobradas · ${res.nVentas} ${res.nVentas === 1 ? "venta" : "ventas"}`}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {MEDIOS.map((m) => (
              <div key={m.id} className="rounded-xl bg-page-soft p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{m.label}</p>
                <p className="mt-1 font-display text-2xl font-black text-ink">{formatPrice(res.porMedio[m.id])}</p>
              </div>
            ))}
          </div>
          {res.sinMedio.n > 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              {res.sinMedio.n} {res.sinMedio.n === 1 ? "venta cobrada" : "ventas cobradas"} sin forma de pago ({formatPrice(res.sinMedio.monto)}): no
              entran en ningún lado. Cargales la forma de pago en Pedidos.
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted">
            Se arma solo con la forma de pago de cada pedido cobrado. Cuando cargás una compra mayorista nueva, arranca de cero
            desde esa fecha. Mercado Pago: sin descontar la comisión.
          </p>
        </>
      )}
    </section>
  );
}
