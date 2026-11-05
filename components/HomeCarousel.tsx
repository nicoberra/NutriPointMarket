"use client";

import { useProducts } from "@/context/ProductsContext";
import { PROMO_DESTACADOS } from "@/lib/config";
import { usePromoDestacados } from "@/lib/promo";
import { ProductCarousel } from "./ProductCarousel";
import { PromoCuentaRegresiva } from "./PromoCuentaRegresiva";
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
    title: "Suplementos deportivos más vendidos",
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
  const promo = usePromoDestacados();
  // Con la promo vigente, los destacados se presentan como promos de la Cyber Week
  // (el bloque "Elegidos" toma el título de la promo; "Destacados" solo el antetítulo).
  const c = promo && kind === "featured"
      ? { ...CONFIG[kind], eyebrow: `⚡ ${PROMO_DESTACADOS.nombre}` }
      : CONFIG[kind];

  if (!list.length) return loading ? <ProductSkeletonRow /> : null;

  // Sección de promos (modelo "Cuenta regresiva"): cuenta regresiva hasta el fin
  // de la promo + destacados en tarjetas. Sin promo, "Nuestros elegidos del mes".
  if (kind === "onSale") return <PromoCuentaRegresiva products={list} />;

  return (
    <ProductCarousel
      eyebrow={c.eyebrow}
      title={c.title}
      products={list}
      viewAllHref={c.viewAllHref}
      bgImage={c.bg || undefined}
      bgVideo={c.video ?? undefined}
    />
  );
}
