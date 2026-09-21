"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { products } from "@/data/products";
import { brandName } from "@/data/brands";
import { categoryMap } from "@/data/categories";
import { SearchIcon } from "./Icons";

export function SearchBar({
  onNavigate,
  autoFocus = false,
}: {
  onNavigate?: () => void;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return products
      .filter((p) => {
        const hay = [
          p.name,
          brandName(p.brand),
          categoryMap[p.category]?.name ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 6);
  }, [query]);

  const submit = (value: string) => {
    const q = value.trim();
    if (!q) return;
    setOpen(false);
    onNavigate?.();
    router.push(`/productos?buscar=${encodeURIComponent(q)}`);
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
        role="search"
      >
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            autoFocus={autoFocus}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="¿Qué estás buscando?"
            aria-label="Buscar productos, marcas o categorías"
            className="h-11 w-full rounded-full border border-transparent bg-white pl-12 pr-24 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-full bg-accent px-4 text-xs font-bold text-primary transition-colors hover:brightness-105"
          >
            Buscar
          </button>
        </div>
      </form>

      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-xl border border-line bg-white shadow-drawer">
          <ul className="max-h-80 overflow-y-auto py-1">
            {suggestions.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/producto/${p.slug}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-page-soft"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent-soft text-xs font-bold text-primary">
                    {brandName(p.brand).slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">
                      {p.name}
                    </span>
                    <span className="block text-xs text-muted">
                      {brandName(p.brand)} · {categoryMap[p.category]?.name}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => submit(query)}
            className="block w-full border-t border-line bg-page-soft px-4 py-2.5 text-left text-xs font-semibold text-primary hover:bg-accent-soft"
          >
            Ver todos los resultados para “{query}”
          </button>
        </div>
      )}
    </div>
  );
}
