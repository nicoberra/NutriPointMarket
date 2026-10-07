"use client";

import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";

/**
 * Detalle FIJO de un combo (tarjeta y editor del CRM): cada producto que lo
 * compone con su costo y su precio de venta (con transferencia), la suma de
 * costos, la suma de precios, el precio del combo y la ganancia.
 */
export function ComboBreakdown({
  product,
  all,
  dollar,
  toPesos,
  comboPrice,
}: {
  product: Product;
  all: Product[];
  dollar: number;
  toPesos: (costo: number, moneda: "USD" | "ARS", dollar: number) => number;
  /** Precio del combo (con transferencia). Si no se pasa, usa el del producto. */
  comboPrice?: number;
}) {
  const rows = (product.combo ?? []).map((c) => {
    const pr = all.find((p) => p.name === c.n);
    const q = Number(c.q) || 1;
    const unitCost = pr ? toPesos(pr.cost || 0, pr.costCurrency ?? "ARS", dollar) : 0;
    const unitPrice = pr ? (pr.basePrice ?? pr.price) : 0;
    return {
      name: c.n,
      brand: pr?.brand ?? "",
      q,
      cost: unitCost * q,
      price: unitPrice * q,
      missing: !pr,
      noCost: !!pr && !(pr.cost && pr.cost > 0),
    };
  });
  if (!rows.length) return null;

  const costTotal = rows.reduce((a, r) => a + r.cost, 0);
  const priceTotal = rows.reduce((a, r) => a + r.price, 0);
  const price = comboPrice ?? product.basePrice ?? product.price;
  const gain = price - costTotal;
  const margin = price > 0 ? Math.round((gain / price) * 100) : 0;
  const saving = priceTotal - price;

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-primary/20 bg-white text-xs">
      <div className="flex items-center justify-between bg-page-soft px-3 py-2">
        <span className="font-bold text-ink">
          Combo · {rows.length} {rows.length === 1 ? "producto" : "productos"}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
          precios con transferencia
        </span>
      </div>
      <table className="w-full">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-wide text-muted">
            <th className="px-3 py-1.5 text-left">Producto</th>
            <th className="px-2 py-1.5 text-right">Costo</th>
            <th className="px-3 py-1.5 text-right">Venta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              <td className="px-3 py-1.5">
                <span className="font-semibold text-ink">
                  {r.q > 1 ? `${r.q}× ` : ""}
                  {r.name}
                </span>
                {r.brand && (
                  <span className="block text-[10px] font-bold uppercase text-primary">{r.brand}</span>
                )}
                {r.missing && (
                  <span className="block text-[10px] font-semibold text-sale">
                    no está en la lista de productos
                  </span>
                )}
                {r.noCost && (
                  <span className="block text-[10px] font-semibold text-amber-600">sin costo cargado</span>
                )}
              </td>
              <td className="px-2 py-1.5 text-right text-muted">{formatPrice(Math.round(r.cost))}</td>
              <td className="px-3 py-1.5 text-right text-muted">{formatPrice(Math.round(r.price))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-primary/30 font-bold text-ink">
            <td className="px-3 py-1.5">Suma</td>
            <td className="px-2 py-1.5 text-right text-sale">{formatPrice(Math.round(costTotal))}</td>
            <td className="px-3 py-1.5 text-right text-primary">{formatPrice(Math.round(priceTotal))}</td>
          </tr>
        </tfoot>
      </table>
      <div className="flex items-center justify-between gap-3 border-t border-line bg-accent-soft px-3 py-2">
        <span className="font-semibold text-ink">
          Precio del combo
          <span className="block text-[10px] font-normal text-muted">
            {saving > 0
              ? `el cliente ahorra ${formatPrice(Math.round(saving))} vs. comprar por separado`
              : `vs. ${formatPrice(Math.round(priceTotal))} por separado`}
          </span>
        </span>
        <span className="text-right">
          <span className="font-display text-base font-black text-primary">{formatPrice(price)}</span>
          <span
            className={`block text-[10px] font-bold ${gain >= 0 ? "text-green-700" : "text-sale"}`}
          >
            {gain >= 0 ? "ganancia" : "pérdida"} {formatPrice(Math.round(Math.abs(gain)))} · {margin}%
          </span>
        </span>
      </div>
    </div>
  );
}
