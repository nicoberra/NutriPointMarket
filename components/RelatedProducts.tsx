"use client";

import { useProducts } from "@/context/ProductsContext";
import { ProductCarousel } from "./ProductCarousel";
import { categoriasDe } from "@/lib/categorias";

/** Productos relacionados (misma categoría primero), alimentado por la planilla. */
export function RelatedProducts({ slug }: { slug: string }) {
  const { products, getBySlug } = useProducts();
  const current = getBySlug(slug);
  if (!current) return null;

  const mias = categoriasDe(current);
  const comparte = (p: typeof current) => categoriasDe(p).some((c) => mias.includes(c));
  const related = products
    .filter((p) => p.id !== current.id && comparte(p))
    .concat(products.filter((p) => p.id !== current.id && !comparte(p)))
    .slice(0, 4);

  if (!related.length) return null;

  return (
    <ProductCarousel title="Nuestros usuarios también suelen comprar" products={related} />
  );
}
