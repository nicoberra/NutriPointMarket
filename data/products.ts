import type { Product, CategorySlug } from "@/lib/types";

/**
 * Los productos NO viven acá: se cargan desde la planilla de Google Sheets.
 * Agregás una fila en el Sheets (o en el CRM) y aparece en la web.
 * Este archivo queda vacío a propósito (solo helpers de respaldo).
 */
export const products: Product[] = [];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(category: CategorySlug): Product[] {
  return products.filter((p) => p.category === category);
}
