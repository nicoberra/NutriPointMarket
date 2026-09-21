import Link from "next/link";
import type { Category } from "@/lib/types";
import { ProductVisual } from "./ProductVisual";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/productos?categoria=${category.slug}`}
      className="group flex w-40 shrink-0 flex-col items-center gap-3 rounded-xl border border-line bg-surface p-4 text-center shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-accent hover:shadow-card-hover sm:w-auto"
    >
      <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-page-soft ring-1 ring-line transition-all group-hover:ring-accent">
        <ProductVisual
          shape={category.shape}
          className="h-24 w-24 transition-transform duration-500 group-hover:scale-110"
        />
      </div>
      <div>
        <p className="text-sm font-bold text-ink group-hover:text-accent">
          {category.name}
        </p>
        <p className="mt-0.5 text-[11px] text-muted">{category.tagline}</p>
      </div>
    </Link>
  );
}
