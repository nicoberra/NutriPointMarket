"use client";

import Link from "next/link";
import { useProducts } from "@/context/ProductsContext";
import { PageBanner } from "@/components/PageBanner";
import { ArrowRightIcon } from "@/components/Icons";

export default function MarcasPage() {
  const { brands, products, loading } = useProducts();

  return (
    <>
      <PageBanner
        title="Nuestras marcas"
        subtitle="Trabajamos solo con marcas líderes y productos 100% originales."
        crumbs={[{ label: "Marcas" }]}
      />

      <section className="container-page py-10">
        {loading && brands.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Cargando marcas…</p>
        ) : brands.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-white py-16 text-center">
            <p className="font-semibold text-ink">Todavía no hay marcas cargadas</p>
            <p className="mt-1 text-sm text-muted">
              Aparecen automáticamente al cargar productos.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {brands.map((b) => {
              const count = products.filter(
                (p) => p.brand.toLowerCase() === b.slug,
              ).length;
              const label = b.name.split(" ")[0].toUpperCase().slice(0, 8);
              return (
                <Link
                  key={b.slug}
                  href={`/productos?marca=${encodeURIComponent(b.slug)}`}
                  className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-line bg-white p-8 text-center shadow-card transition-all hover:-translate-y-1 hover:border-accent hover:shadow-card-hover"
                >
                  <span className="font-display text-2xl font-black tracking-tight text-primary transition-colors group-hover:text-primary">
                    {label}
                  </span>
                  <span className="text-sm font-semibold text-ink">{b.name}</span>
                  <span className="text-xs text-muted">{count} productos</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Ver productos <ArrowRightIcon className="h-3.5 w-3.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
