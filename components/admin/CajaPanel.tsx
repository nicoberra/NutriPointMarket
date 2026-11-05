"use client";

import { useEffect, useMemo, useState } from "react";
import { peekTable, ensureTable, subscribeTable } from "@/lib/tableCache";
import { calcularCaja, MEDIOS, type Medio } from "@/lib/caja";
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

  const [abierto, setAbierto] = useState<Medio | null>(null);
  const res = useMemo(() => (pedidos && compras ? calcularCaja(pedidos, compras) : null), [pedidos, compras]);

  // Pedidos que suman en un lado. En el celu va justo debajo del recuadro tocado;
  // en la compu, debajo de los tres.
  const lista = (medio: Medio, id: string) => {
    const filas = res?.pedidosPorMedio[medio] ?? [];
    if (!filas.length) return null;
    return (
      <ul id={id} className="animate-slide-up sm:mt-3 divide-y divide-line rounded-xl border border-line motion-reduce:animate-none">
              {filas.map((r, i) => (
                <li key={String(r.id ?? i)} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{String(r.cliente ?? "") || "Sin nombre"}</p>
                    <p className="text-xs text-muted">{String(r.fecha ?? "").replace(/^(\d{4})-(\d{2})-(\d{2})/, "$3/$2/$1")}</p>
                    {r.detalle ? <p className="mt-0.5 line-clamp-2 text-xs text-muted">{String(r.detalle).replace(/ \| /g, " · ")}</p> : null}
                  </div>
                  <p className="shrink-0 text-sm font-bold text-ink">{formatPrice(Number(String(r.monto ?? "").replace(/[^\d.,-]/g, "").replace(",", ".")) || 0)}</p>
                </li>
              ))}
            </ul>
    );
  };

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
            {MEDIOS.map((m) => {
              const n = res.pedidosPorMedio[m.id].length;
              const activo = abierto === m.id;
              return (
                <div key={m.id} className="contents">
                <button
                  type="button"
                  onClick={() => setAbierto(activo ? null : m.id)}
                  aria-expanded={activo}
                  aria-controls="caja-pedidos caja-pedidos-celu"
                  disabled={n === 0}
                  className={`rounded-xl p-4 text-left transition-[background-color,box-shadow,transform] duration-200 active:scale-[0.98] disabled:cursor-default disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100 ${
                    activo ? "bg-primary text-white shadow-soft" : "bg-page-soft hover:bg-accent-soft"
                  }`}
                >
                  <span className={`flex items-center justify-between text-xs font-bold uppercase tracking-wide ${activo ? "text-white/80" : "text-muted"}`}>
                    {m.label}
                    {n > 0 && (
                      <span className="flex items-center gap-1 normal-case tracking-normal">
                        {n} {n === 1 ? "pedido" : "pedidos"}
                        <span aria-hidden className={`inline-block transition-transform duration-200 motion-reduce:transition-none ${activo ? "rotate-180" : ""}`}>⌄</span>
                      </span>
                    )}
                  </span>
                  <span className={`mt-1 block font-display text-2xl font-black ${activo ? "text-white" : "text-ink"}`}>{formatPrice(res.porMedio[m.id])}</span>
                </button>
                {activo && <div className="sm:hidden">{lista(m.id, "caja-pedidos-celu")}</div>}
                </div>
              );
            })}
          </div>
          {abierto && <div className="hidden sm:block">{lista(abierto, "caja-pedidos")}</div>}
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
