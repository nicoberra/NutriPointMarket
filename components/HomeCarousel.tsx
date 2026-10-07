"use client";

import { useProducts } from "@/context/ProductsContext";
import { ProductCarousel } from "./ProductCarousel";
import { ProductSkeletonRow } from "./ProductSkeleton";

const CONFIG = {
  onSale: {
    eyebrow: "Ofertas del mes",
    title: "Nuestros elegidos del mes",
    viewAllHref: "/ofertas",
    bg: "/banner-elegidos.jpg", // poster mientras carga el video
    video: { desktop: "/videos/elegidos-compu.mp4", mobile: "/videos/elegidos-celu.mp4" },
  },
  featured: {
    eyebrow: "Lo más elegido",
    title: "Productos destacados",
    viewAllHref: "/productos?orden=destacados",
    bg: "",
    video: null,
  },
  bestSellers: {
    eyebrow: "Ranking",
    title: "Los más vendidos",
    viewAllHref: "/productos?orden=mas-vendidos",
    bg: "",
    video: null,
  },
} as const;

/** Carrusel de la home alimentado por los productos en vivo (planilla). */
export function HomeCarousel({ kind }: { kind: keyof typeof CONFIG }) {
  const { featured, bestSellers, loading } = useProducts();
  // "Elegidos del mes" y "Destacados" muestran lo mismo: los marcados destacado.
  const list = kind === "bestSellers" ? bestSellers : featured;
  const c = CONFIG[kind];

  if (!list.length) return loading ? <ProductSkeletonRow /> : null;

  return (
    <ProductCarousel
      eyebrow={c.eyebrow}
      title={c.title}
      products={list}
      viewAllHref={c.viewAllHref}
      bgImage={c.bg || undefined}
      bgVideo={c.video ?? undefined}
      id={kind === "onSale" ? "elegidos" : undefined}
    />
  );
}
