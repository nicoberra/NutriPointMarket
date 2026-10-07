"use client";

import Link from "next/link";
import { useProducts } from "@/context/ProductsContext";
import { ASSET_PREFIX } from "@/lib/config";
import { formatPrice } from "@/lib/format";

/**
 * Lado derecho del hero (solo desktop): el logo con la mascota sobre blobs de
 * color y dos mini tarjetas flotantes con productos destacados reales (de la
 * planilla). Sin datos inventados: si no hay destacados, usa los primeros
 * productos con foto; si no hay ninguno, solo el logo.
 */
export function HeroShowcase() {
  const { featured, products } = useProducts();
  const picks = (featured.length ? featured : products).filter((p) => p.image).slice(0, 2);

  return (
    <div className="relative mx-auto w-full max-w-lg">
      {/* Blobs decorativos (en la ETAPA 4 tienen parallax suave) */}
      <div
        aria-hidden
        data-hero-blob
        className="pointer-events-none absolute -left-8 top-4 h-56 w-56 rounded-full bg-accent/50 blur-3xl"
      />
      <div
        aria-hidden
        data-hero-blob
        className="pointer-events-none absolute -right-4 bottom-2 h-64 w-64 rounded-full bg-primary/15 blur-3xl"
      />

      {/* Logo con la mascota */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-hero-logo
        src={`${ASSET_PREFIX}/logo.png`}
        alt="Suple Market"
        fetchPriority="high"
        decoding="async"
        className="relative z-10 mx-auto w-full max-w-md object-contain"
      />

      {/* Destacados flotantes */}
      {picks.map((p, i) => (
        <Link
          key={p.id}
          href={`/producto?slug=${p.slug}`}
          data-hero-pick
          className={`absolute z-20 flex w-48 items-center gap-2.5 rounded-xl border border-line bg-white/95 p-2 shadow-card backdrop-blur transition-[transform,box-shadow] duration-300 ease-enter hover:-translate-y-1 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
            i === 0 ? "left-0 top-3" : "bottom-6 right-0"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={p.image}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-12 w-12 shrink-0 rounded-lg bg-page-soft object-cover"
          />
          <span className="min-w-0">
            {p.brand && (
              <span className="block truncate text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                {p.brand}
              </span>
            )}
            <span className="block truncate text-xs font-semibold text-ink">{p.name}</span>
            <span className="block font-display text-sm font-black text-primary">
              {formatPrice(p.price)}
            </span>
          </span>
        </Link>
      ))}
    </div>
  );
}
