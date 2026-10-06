"use client";

import { useProducts } from "@/context/ProductsContext";
import { ProductCarousel } from "./ProductCarousel";

const CONFIG = {
  onSale: {
    eyebrow: "Ofertas del mes",
    title: "Nuestros elegidos del mes",
    viewAllHref: "/ofertas",
    bg: "/banner-elegidos.jpg", // banner de fondo (public/)
  },
  featured: {
    eyebrow: "Lo más elegido",
    title: "Productos destacados",
    viewAllHref: "/productos?orden=destacados",
    bg: "",
  },
  bestSellers: {
    eyebrow: "Ranking",
    title: "Los más vendidos",
    viewAllHref: "/productos?orden=mas-vendidos",
    bg: "",
  },
} as const;

/** Carrusel de la home alimentado por los productos en vivo (planilla). */
export function HomeCarousel({ kind }: { kind: keyof typeof CONFIG }) {
  const { featured, bestSellers } = useProducts();
  // "Elegidos del mes" y "Destacados" muestran lo mismo: los marcados destacado.
  const list = kind === "bestSellers" ? bestSellers : featured;
  const c = CONFIG[kind];

  if (!list.length) return null;

  return (
    <ProductCarousel
      eyebrow={c.eyebrow}
      title={c.title}
      products={list}
      viewAllHref={c.viewAllHref}
      bgImage={c.bg || undefined}
      id={kind === "onSale" ? "elegidos" : undefined}
    />
  );
}
