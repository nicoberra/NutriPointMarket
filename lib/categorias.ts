import type { CategorySlug, Product } from "@/lib/types";

/**
 * Un producto puede estar en varias categorías: en la planilla se guardan en la
 * columna Categoría separadas por " | " ("Pancakes PROTEICOS | Snacks proteicos").
 * La primera es la principal (ícono, migas de pan y link de la ficha).
 */
export const SEP_CATEGORIAS = " | ";

/** "A | B | A" → ["A", "B"] (sin vacíos ni repetidos). */
export function nombresCategorias(txt: unknown): string[] {
  const out: string[] = [];
  for (const n of String(txt ?? "").split("|").map((s) => s.trim()).filter(Boolean)) {
    if (!out.some((x) => x.toLowerCase() === n.toLowerCase())) out.push(n);
  }
  return out;
}

/** Todas las categorías (slugs) del producto; la primera es la principal. */
export function categoriasDe(p: Pick<Product, "category" | "categories">): CategorySlug[] {
  return p.categories?.length ? p.categories : [p.category];
}

export const estaEnCategoria = (p: Pick<Product, "category" | "categories">, slug: CategorySlug) =>
  categoriasDe(p).includes(slug);
