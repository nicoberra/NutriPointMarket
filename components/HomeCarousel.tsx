"use client";

import { useProducts } from "@/context/ProductsContext";
import { ProductCarousel } from "./ProductCarousel";

const CONFIG = {
  onSale: {
    eyebrow: "Ofertas del mes",
    title: "Nuestros elegidos del mes",
    viewAllHref: "/ofertas",
  },
  featured: {
    eyebrow: "Lo más elegido",
    title: "Productos destacados",
    viewAllHref: "/productos?orden=destacados",
  },
  bestSellers: {
    eyebrow: "Ranking",
    title: "Los más vendidos",
    viewAllHref: "/productos?orden=mas-vendidos",
  },
} as const;

/** Carrusel de la home alimentado por los productos en vivo (planilla). */
export function HomeCarousel({ kind }: { kind: keyof typeof CONFIG }) {
  const { onSale, featured, bestSellers } = useProducts();
  const list = kind === "onSale" ? onSale : kind === "featured" ? featured : bestSellers;
  const c = CONFIG[kind];

  if (!list.length) return null;

  return (
    <ProductCarousel
      eyebrow={c.eyebrow}
      title={c.title}
      products={list}
      viewAllHref={c.viewAllHref}
    />
  );
}
