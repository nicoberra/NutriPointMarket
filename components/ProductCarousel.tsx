"use client";

import { useRef } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { ChevronLeftIcon, ChevronRightIcon, ArrowRightIcon } from "./Icons";

export function ProductCarousel({
  title,
  eyebrow,
  products,
  viewAllHref,
}: {
  title: string;
  eyebrow?: string;
  products: Product[];
  viewAllHref?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.85, 640);
    el.scrollBy({ left: amount * dir, behavior: "smooth" });
  };

  return (
    <section className="container-page py-10 sm:py-14">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-accent">
              {eyebrow}
            </p>
          )}
          <h2 className="section-title">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="hidden items-center gap-1 text-sm font-semibold text-primary hover:text-accent sm:inline-flex"
            >
              Ver todo <ArrowRightIcon className="h-4 w-4" />
            </Link>
          )}
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Anterior"
              className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-primary transition-colors hover:bg-primary hover:text-white"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Siguiente"
              className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-primary transition-colors hover:bg-primary hover:text-white"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scroller}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
      >
        {products.map((p) => (
          <div
            key={p.id}
            className="w-[calc(50%-8px)] shrink-0 snap-start sm:w-[240px]"
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {viewAllHref && (
        <div className="mt-6 text-center sm:hidden">
          <Link href={viewAllHref} className="btn btn-outline btn-md">
            Ver todo <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}
