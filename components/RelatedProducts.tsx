"use client";

import { useProducts } from "@/context/ProductsContext";
import { ProductCarousel } from "./ProductCarousel";

/** Productos relacionados (misma categoría primero), alimentado por la planilla. */
export function RelatedProducts({ slug }: { slug: string }) {
  const { products, getBySlug } = useProducts();
  const current = getBySlug(slug);
  if (!current) return null;

  const related = products
    .filter((p) => p.id !== current.id && p.category === current.category)
    .concat(products.filter((p) => p.id !== current.id && p.category !== current.category))
    .slice(0, 4);

  if (!related.length) return null;

  return <ProductCarousel title="Productos relacionados" products={related} />;
}
