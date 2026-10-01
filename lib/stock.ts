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
