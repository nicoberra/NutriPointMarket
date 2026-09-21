"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { products as ALL } from "@/data/products";
import { categories } from "@/data/categories";
import { brands, brandName } from "@/data/brands";
import type { CategorySlug } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { ProductCard } from "./ProductCard";
import { FilterIcon, CloseIcon, SearchIcon } from "./Icons";

type SortKey = "destacados" | "mas-vendidos" | "novedades" | "precio-asc" | "precio-desc";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "destacados", label: "Destacados" },
  { key: "mas-vendidos", label: "Más vendidos" },
  { key: "novedades", label: "Novedades" },
  { key: "precio-asc", label: "Precio: menor a mayor" },
  { key: "precio-desc", label: "Precio: mayor a menor" },
];

const PRICE_MAX = 80000;

export function Catalog({ onlyOffers = false }: { onlyOffers?: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [search, setSearch] = useState(searchParams.get("buscar") ?? "");
  const [selectedCats, setSelectedCats] = useState<CategorySlug[]>(
    (searchParams.get("categoria")?.split(",").filter(Boolean) as CategorySlug[]) ?? [],
  );
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    searchParams.get("marca")?.split(",").filter(Boolean) ?? [],
  );
  const [maxPrice, setMaxPrice] = useState<number>(PRICE_MAX);
  const [sort, setSort] = useState<SortKey>(
    (searchParams.get("orden") as SortKey) || "destacados",
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Sincronizar cuando cambian los parámetros de la URL (navegación desde menú)
  useEffect(() => {
    setSearch(searchParams.get("buscar") ?? "");
    setSelectedCats(
      (searchParams.get("categoria")?.split(",").filter(Boolean) as CategorySlug[]) ?? [],
    );
    setSelectedBrands(searchParams.get("marca")?.split(",").filter(Boolean) ?? []);
    const orden = searchParams.get("orden") as SortKey;
    if (orden) setSort(orden);
  }, [searchParams]);

  // Persistir orden en la URL (para poder compartir/volver)
  useEffect(() => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (sort && sort !== "destacados") params.set("orden", sort);
    else params.delete("orden");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort]);

  const toggleCat = (slug: CategorySlug) =>
    setSelectedCats((prev) =>
      prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug],
    );

  const toggleBrand = (slug: string) =>
    setSelectedBrands((prev) =>
      prev.includes(slug) ? prev.filter((b) => b !== slug) : [...prev, slug],
    );

  const clearFilters = () => {
    setSelectedCats([]);
    setSelectedBrands([]);
    setMaxPrice(PRICE_MAX);
    setSearch("");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = ALL.filter((p) => {
      if (onlyOffers && p.discount <= 0) return false;
      if (selectedCats.length && !selectedCats.includes(p.category)) return false;
      if (selectedBrands.length && !selectedBrands.includes(p.brand)) return false;
      if (p.price > maxPrice) return false;
      if (q) {
        const hay = `${p.name} ${brandName(p.brand)} ${p.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "precio-asc":
          return a.price - b.price;
        case "precio-desc":
          return b.price - a.price;
        case "mas-vendidos":
          return Number(b.bestSeller) - Number(a.bestSeller) || b.reviews - a.reviews;
        case "novedades":
          return Number(b.isNew ?? false) - Number(a.isNew ?? false);
        default:
          return Number(b.featured) - Number(a.featured) || b.rating - a.rating;
      }
    });

    return list;
  }, [search, selectedCats, selectedBrands, maxPrice, sort, onlyOffers]);

  const activeCount =
    selectedCats.length + selectedBrands.length + (maxPrice < PRICE_MAX ? 1 : 0);

  const FiltersPanel = (
    <div className="space-y-6">
      {/* Buscar dentro */}
      <div>
        <label className="mb-2 block text-sm font-bold text-ink">Buscar</label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nombre o marca"
            className="input h-10 pl-9"
          />
        </div>
      </div>

      {/* Categorías */}
      <div>
        <h3 className="mb-2.5 text-sm font-bold text-ink">Categorías</h3>
        <ul className="space-y-1.5">
          {categories.map((c) => (
            <li key={c.slug}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted hover:text-ink">
                <input
                  type="checkbox"
                  checked={selectedCats.includes(c.slug)}
                  onChange={() => toggleCat(c.slug)}
                  className="h-4 w-4 rounded border-line accent-[rgb(var(--color-accent))]"
                />
                {c.name}
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* Marcas */}
      <div>
        <h3 className="mb-2.5 text-sm font-bold text-ink">Marcas</h3>
        <ul className="space-y-1.5">
          {brands.map((b) => (
            <li key={b.slug}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted hover:text-ink">
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(b.slug)}
                  onChange={() => toggleBrand(b.slug)}
                  className="h-4 w-4 rounded border-line accent-[rgb(var(--color-accent))]"
                />
                {b.name}
              </label>
            </li>
          ))}
        </ul>
      </div>

      {/* Precio */}
      <div>
        <h3 className="mb-2.5 text-sm font-bold text-ink">Precio máximo</h3>
        <input
          type="range"
          min={5000}
          max={PRICE_MAX}
          step={1000}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[rgb(var(--color-accent))]"
        />
        <p className="mt-1 text-sm text-muted">
          Hasta <span className="font-semibold text-ink">{formatPrice(maxPrice)}</span>
        </p>
      </div>

      {activeCount > 0 && (
        <button onClick={clearFilters} className="btn btn-ghost btn-sm w-full border border-line">
          Limpiar filtros ({activeCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="container-page py-8">
      <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-8">
        {/* Sidebar desktop */}
        <aside className="hidden lg:block">
          <div className="sticky top-40 rounded-xl border border-line bg-white p-5">
            {FiltersPanel}
          </div>
        </aside>

        {/* Resultados */}
        <div>
          {/* Barra superior: contador + orden + botón filtros mobile */}
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm text-muted">
              <span className="font-bold text-ink">{filtered.length}</span> productos
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDrawerOpen(true)}
                className="btn btn-outline btn-sm lg:hidden"
              >
                <FilterIcon className="h-4 w-4" />
                Filtros
                {activeCount > 0 && (
                  <span className="ml-0.5 grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-primary">
                    {activeCount}
                  </span>
                )}
              </button>
              <label className="flex items-center gap-2 text-sm">
                <span className="hidden text-muted sm:inline">Ordenar:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                  className="input h-10 w-auto cursor-pointer pr-8 text-sm"
                >
                  {SORTS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line bg-white py-20 text-center">
              <p className="font-semibold text-ink">No encontramos productos</p>
              <p className="mt-1 text-sm text-muted">Probá ajustando los filtros o la búsqueda.</p>
              <button onClick={clearFilters} className="btn btn-primary btn-md mt-4">
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Drawer de filtros (mobile) */}
      <div
        onClick={() => setDrawerOpen(false)}
        className={`fixed inset-0 z-[80] bg-black/50 transition-opacity lg:hidden ${
          drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />
      <aside
        className={`fixed left-0 top-0 z-[90] flex h-full w-[85%] max-w-xs flex-col bg-white shadow-drawer transition-transform lg:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="font-display text-lg font-bold text-primary">Filtros</h2>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar filtros"
            className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-page-soft"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{FiltersPanel}</div>
        <div className="border-t border-line p-4">
          <button onClick={() => setDrawerOpen(false)} className="btn btn-primary btn-md w-full">
            Ver {filtered.length} productos
          </button>
        </div>
      </aside>
    </div>
  );
}
