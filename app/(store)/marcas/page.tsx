import type { Metadata } from "next";
import Link from "next/link";
import { PageBanner } from "@/components/PageBanner";
import { brands } from "@/data/brands";
import { products } from "@/data/products";
import { ArrowRightIcon } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Marcas",
  description: "Las mejores marcas de suplementos deportivos en NutriPointMarket.",
};

export default function MarcasPage() {
  return (
    <>
      <PageBanner
        title="Nuestras marcas"
        subtitle="Trabajamos solo con marcas líderes y productos 100% originales."
        crumbs={[{ label: "Marcas" }]}
      />

      <section className="container-page py-10">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {brands.map((b) => {
            const count = products.filter((p) => p.brand === b.slug).length;
            return (
              <Link
                key={b.slug}
                href={`/productos?marca=${b.slug}`}
                className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-line bg-white p-8 text-center shadow-card transition-all hover:-translate-y-1 hover:border-accent hover:shadow-card-hover"
              >
                <span className="font-display text-2xl font-black tracking-tight text-primary transition-colors group-hover:text-accent">
                  {b.label}
                </span>
                <span className="text-sm font-semibold text-ink">{b.name}</span>
                <span className="text-xs text-muted">{count} productos</span>
                <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-accent opacity-0 transition-opacity group-hover:opacity-100">
                  Ver productos <ArrowRightIcon className="h-3.5 w-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
