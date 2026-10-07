"use client";

import { ASSET_PREFIX } from "@/lib/config";

/**
 * Lado derecho del hero (solo desktop): el logo con la mascota sobre blobs de
 * color (con parallax y flotación suave desde HeroIntro).
 */
export function HeroShowcase() {
  return (
    <div className="relative mx-auto w-full max-w-lg">
      {/* Blobs decorativos */}
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
    </div>
  );
}
