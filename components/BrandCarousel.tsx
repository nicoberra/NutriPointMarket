"use client";

import Link from "next/link";
import { useProducts } from "@/context/ProductsContext";

/**
 * "Las mejores marcas". Las marcas se derivan de los productos cargados en la
 * planilla. Por ahora los logos son cajas tipográficas; se pueden reemplazar
 * por imágenes reales más adelante.
 */
export function BrandCarousel() {
  const { brands } = useProducts();

  if (brands.length === 0) return null;

  return (
    <section className="bg-page-soft py-10 sm:py-14">
      <div className="container-page">
        <div className="mb-6 text-center">
          <p className="mb-1 text-sm font-bold uppercase tracking-wider text-accent">
            Trabajamos con
          </p>
          <h2 className="section-title">Las mejores marcas</h2>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {brands.slice(0, 16).map((b) => (
            <Link
              key={b.slug}
              href={`/productos?marca=${encodeURIComponent(b.slug)}`}
              className="group flex h-20 items-center justify-center rounded-xl border border-line bg-white px-3 text-center shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-card"
              aria-label={b.name}
            >
              <span className="font-display text-sm font-black uppercase tracking-tight text-primary transition-colors group-hover:text-accent">
                {b.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
