"use client";

import Link from "next/link";
import { useCategories } from "@/context/CategoriesContext";
import { useProducts } from "@/context/ProductsContext";
import { ChevronDownIcon } from "./Icons";

/** Ítems simples del menú (aparte del mega-menú de Productos). */
const SIMPLE = [
  { label: "Marcas", href: "/marcas" },
  { label: "Combos", href: "/productos?categoria=combos" },
  { label: "Ofertas", href: "/ofertas", highlight: true },
  { label: "Contacto", href: "/contacto" },
];

/**
 * Navegación desktop. "Productos" abre un mega-menú con una columna por
 * categoría (de la planilla) y los productos de cada una + "Ver todos".
 */
export function Navbar() {
  const { categories } = useCategories();
  const { byCategory } = useProducts();

  return (
    <nav aria-label="Navegación principal" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {/* Mega-menú Productos */}
        <li className="group relative">
          <Link
            href="/productos"
            className="flex items-center gap-1 rounded-md px-3 py-2.5 text-sm font-semibold text-white/90 transition-colors hover:text-accent"
          >
            Productos <ChevronDownIcon className="h-3.5 w-3.5" />
          </Link>

          <div className="invisible absolute left-0 top-full z-50 translate-y-1 pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
            <div className="w-[min(92vw,900px)] rounded-2xl border border-line bg-white p-6 shadow-drawer">
              <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
                {categories.map((c) => {
                  const prods = byCategory(c.slug).slice(0, 6);
                  return (
                    <div key={c.slug} className="min-w-0">
                      <Link
                        href={`/productos?categoria=${c.slug}`}
                        className="font-display text-sm font-extrabold text-primary hover:opacity-80"
                      >
                        {c.name}
                      </Link>
                      <ul className="mt-2 space-y-1.5">
                        {prods.map((p) => (
                          <li key={p.id}>
                            <Link
                              href={`/producto?slug=${p.slug}`}
                              className="block truncate text-sm text-muted transition-colors hover:text-primary"
                            >
                              {p.name}
                            </Link>
                          </li>
                        ))}
                        <li>
                          <Link
                            href={`/productos?categoria=${c.slug}`}
                            className="block text-sm font-semibold text-ink/50 transition-colors hover:text-primary"
                          >
                            Ver todos
                          </Link>
                        </li>
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </li>

        {SIMPLE.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              className={`flex items-center rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
                item.highlight ? "text-accent hover:text-accent" : "text-white/90 hover:text-accent"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
