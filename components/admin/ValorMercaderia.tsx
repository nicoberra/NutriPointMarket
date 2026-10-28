"use client";

import { useEffect, useMemo, useState } from "react";
import { useProducts } from "@/context/ProductsContext";
import { peekTable, ensureTable, subscribeTable } from "@/lib/tableCache";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useDollar, costToPesos } from "./AdminProducts";

/**
 * CRM · Plata en mercadería: stock actual × costo de cada producto (en pesos;
 * los costos en dólares se pasan con el blue del día). Los combos no se
 * cuentan porque su stock son los mismos productos que los arman.
 * Se muestra en Facturación y en Compras.
 */

/** Unidades en stock: suma de las variantes con seguimiento o la columna Cantidad. */
function unidades(p: Product): number {
  const vs = (p.variants ?? []).filter((v) => typeof v.qty === "number");
  const n = vs.length ? vs.reduce((s, v) => s + Math.max(0, v.qty as number), 0) : (p.stockQty ?? 0);
  return Math.max(0, n);
}

function monto(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function ValorMercaderia() {
  const { products, loading } = useProducts();
  const dollar = useDollar();
  // Compras cargadas pero todavía sin sumar al stock (no entran en el valor).
  const [pendiente, setPendiente] = useState({ total: 0, n: 0 });

  useEffect(() => {
    const calc = (rows: Record<string, unknown>[]) => {
      let total = 0, n = 0;
      for (const r of rows) {
        if (String(r.sumado ?? "").trim().toLowerCase() !== "no") continue;
        total += monto(r.total);
        n++;
      }
      setPendiente({ total, n });
    };
    const cached = peekTable<Record<string, unknown>>("Compras");
    if (cached) calc(cached);
    const unsub = subscribeTable("Compras", calc);
    ensureTable<Record<string, unknown>>("Compras").catch(() => {});
    return unsub;
  }, []);

  const m = useMemo(() => {
    let total = 0, uds = 0, prods = 0, enDolares = false;
    const sinCosto: string[] = [];
    for (const p of products) {
      if (p.combo?.length) continue;
      const u = unidades(p);
      if (!u) continue;
      prods++;
      uds += u;
      const costo = p.cost ?? 0;
      if (costo <= 0) {
        sinCosto.push(p.name);
        continue;
      }
      if (p.costCurrency === "USD") enDolares = true;
      total += costToPesos(costo, p.costCurrency ?? "ARS", dollar) * u;
    }
    return { total, uds, prods, enDolares, sinCosto };
  }, [products, dollar]);

  // El costo llega con el token unos segundos después de pintar: hasta que haya
  // algún costo (o dólar, si hace falta) se muestra cargando, no un $0 falso.
  const esperando = (loading && m.total === 0) || (m.enDolares && !dollar);

  return (
    <section className="rounded-2xl border border-line bg-white p-5" aria-busy={esperando}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">📦 Plata en mercadería</p>
          {esperando ? (
            <div className="mt-2 h-8 w-40 animate-pulse rounded-lg bg-page-soft motion-reduce:animate-none" />
          ) : (
            <p className="mt-1 font-display text-3xl font-black text-primary">{formatPrice(Math.round(m.total))}</p>
          )}
          <p className="mt-1 text-xs text-muted">
            Stock actual al costo · {m.uds} {m.uds === 1 ? "unidad" : "unidades"} de {m.prods}{" "}
            {m.prods === 1 ? "producto" : "productos"}
            {m.enDolares && dollar > 0 && <> · dólar blue ${dollar}</>}
          </p>
        </div>
      </div>

      {m.sinCosto.length > 0 && (
        <details className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <summary className="cursor-pointer font-semibold">
            ⚠ {m.sinCosto.length} {m.sinCosto.length === 1 ? "producto con stock no tiene" : "productos con stock no tienen"} costo
            cargado (no se suman)
          </summary>
          <p className="mt-1.5 leading-relaxed">{m.sinCosto.join(" · ")}</p>
        </details>
      )}

      {pendiente.n > 0 && (
        <p className="mt-2 text-xs text-muted">
          ⏳ Además hay <b className="text-ink">{formatPrice(Math.round(pendiente.total))}</b> en {pendiente.n}{" "}
          {pendiente.n === 1 ? "compra" : "compras"} sin sumar al stock.
        </p>
      )}
    </section>
  );
}
