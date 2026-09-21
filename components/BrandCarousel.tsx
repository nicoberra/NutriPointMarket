import Link from "next/link";
import { brands } from "@/data/brands";

/**
 * "Las mejores marcas". Por ahora los logos son cajas tipográficas.
 * Para reemplazar por logos reales, cambiar el contenido de <BrandLogo />
 * por un <Image /> (un componente por marca facilita el reemplazo).
 */
export function BrandCarousel() {
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
          {brands.map((b) => (
            <Link
              key={b.slug}
              href={`/productos?marca=${b.slug}`}
              className="group flex h-20 items-center justify-center rounded-xl border border-line bg-white px-3 shadow-soft transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-card"
              aria-label={b.name}
            >
              <BrandLogo label={b.label} name={b.name} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Logo placeholder de marca (tipográfico). Reemplazable por <Image />. */
function BrandLogo({ label, name }: { label: string; name: string }) {
  return (
    <span className="flex flex-col items-center leading-none">
      <span className="font-display text-lg font-black tracking-tight text-primary transition-colors group-hover:text-accent">
        {label}
      </span>
      <span className="mt-1 text-[10px] uppercase tracking-widest text-muted">
        {name}
      </span>
    </span>
  );
}
