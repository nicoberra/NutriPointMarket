import type { Product, CartItem } from "./types";

/**
 * Máximo que se puede comprar de un producto (según la variante elegida):
 * el stock de esa variante, o el stock total del producto. Sin seguimiento → 99.
 */
export function stockMax(product: Product, flavor?: string): number {
  const v = product.variants?.find((x) => x.name === flavor);
  if (v && v.qty != null) return Math.max(1, v.qty);
  return (product.stockQty ?? 0) > 0 ? (product.stockQty as number) : 99;
}

/** Variantes de un producto que tienen stock (sin seguimiento = disponible). */
export function availableVariants(p: Product): string[] {
  if (!p.variants?.length) return [];
  return p.variants.filter((v) => v.qty == null || v.qty > 0).map((v) => v.name);
}

/** Productos que componen un combo (resueltos contra el catálogo) y cuántos de cada uno. */
export function comboComponents(
  product: Product,
  all: Product[],
): { comp: Product; q: number }[] {
  if (!product.combo?.length) return [];
  const byName = new Map(all.map((p) => [p.name, p]));
  const out: { comp: Product; q: number }[] = [];
  for (const c of product.combo) {
    const comp = byName.get(c.n);
    if (comp) out.push({ comp, q: Number(c.q) || 1 });
  }
  return out;
}

/** ¿El combo tiene algún producto con variantes? (el cliente debe elegir). */
export function comboNeedsChoice(product: Product, all: Product[]): boolean {
  return comboComponents(product, all).some(({ comp }) => comp.flavors.length > 0);
}

/**
 * Cuántos combos se pueden comprar con las variantes elegidas: el menor stock
 * (dividido por la cantidad que lleva el combo) manda. Sin seguimiento → 99.
 */
export function comboStockMax(
  product: Product,
  all: Product[],
  choices: Record<string, string>,
): number {
  const comps = comboComponents(product, all);
  if (!comps.length) return stockMax(product);
  let max = Infinity;
  for (const { comp, q } of comps) {
    if (comp.inStock === false) return 0;
    const v = comp.variants?.find((x) => x.name === choices[comp.name]);
    if (v) {
      if (v.qty == null) continue; // variante sin seguimiento: no limita
      if (v.qty <= 0) return 0;
      max = Math.min(max, Math.floor(v.qty / q));
    } else {
      const s = comp.stockQty ?? 0;
      if (s > 0) max = Math.min(max, Math.floor(s / q));
    }
  }
  return Number.isFinite(max) ? max : 99;
}

/** Máximo comprable de un ítem del carrito (combo con elección o producto normal). */
export function itemMax(item: CartItem, all: Product[]): number {
  if (item.comboChoices) return Math.max(1, comboStockMax(item.product, all, item.comboChoices));
  return stockMax(item.product, item.flavor);
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
