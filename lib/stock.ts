import type { Product } from "./types";

/**
 * Máximo que se puede comprar de un producto (según la variante elegida):
 * el stock de esa variante, o el stock total del producto. Sin seguimiento → 99.
 */
export function stockMax(product: Product, flavor?: string): number {
  const v = product.variants?.find((x) => x.name === flavor);
  if (v && v.qty != null) return Math.max(1, v.qty);
  return (product.stockQty ?? 0) > 0 ? (product.stockQty as number) : 99;
}

/**
 * Para los combos, calcula cuántos se pueden armar según el stock de cada
 * producto que lo compone (el menor manda). Si un componente no tiene
 * seguimiento de stock, no limita.
 */
export function applyComboStock(products: Product[]): Product[] {
  const byName = new Map(products.map((p) => [p.name, p]));
  return products.map((p) => {
    if (!p.combo || !p.combo.length) return p;
    let max = Infinity;
    for (const c of p.combo) {
      const comp = byName.get(c.n);
      if (!comp || comp.inStock === false) {
        max = 0;
        break;
      }
      const s = comp.stockQty ?? 0;
      if (s > 0 && c.q > 0) max = Math.min(max, Math.floor(s / c.q));
    }
    if (Number.isFinite(max)) return { ...p, stockQty: max, inStock: max > 0 };
    return p; // componentes sin seguimiento → combo disponible
  });
}
