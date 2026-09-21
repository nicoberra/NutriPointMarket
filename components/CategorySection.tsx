import Link from "next/link";
import { categories } from "@/data/categories";
import { CategoryCard } from "./CategoryCard";
import { ArrowRightIcon } from "./Icons";

/** Categorías destacadas: grid en desktop, scroll horizontal en mobile. */
export function CategorySection() {
  return (
    <section className="container-page py-10 sm:py-14">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-bold uppercase tracking-wider text-primary">
            Comprá por categoría
          </p>
          <h2 className="section-title">Categorías destacadas</h2>
        </div>
        <Link
          href="/productos"
          className="hidden items-center gap-1 text-sm font-semibold text-primary hover:text-primary sm:inline-flex"
        >
          Ver todo <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-6 xl:grid-cols-9">
        {categories.map((c) => (
          <CategoryCard key={c.slug} category={c} />
        ))}
      </div>
    </section>
  );
}
