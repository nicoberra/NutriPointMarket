"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCategories } from "@/context/CategoriesContext";
import { useProducts } from "@/context/ProductsContext";
import { SITE, whatsappLink } from "@/lib/config";
import { formatPrice } from "@/lib/format";
import { ChevronDownIcon, WhatsappIcon, MailIcon, InstagramIcon } from "./Icons";

/** Marcas con las que trabajamos (menú desplegable). */
const BRANDS = [
  { label: "ENA", value: "ena" },
  { label: "STAR", value: "star" },
  { label: "GRANGER", value: "granger" },
];

const TRIGGER =
  "flex items-center gap-1 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors";
const PANEL =
  "invisible absolute left-0 top-full z-50 translate-y-1 pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100";
const ITEM =
  "block rounded-lg px-3 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-page-soft hover:text-primary";
const FOOT =
  "mt-1 block border-t border-line px-3 pb-1 pt-2.5 text-sm font-semibold text-ink/60 transition-colors hover:text-primary";

/** Ítem del menú con panel desplegable al pasar el mouse. */
function Menu({
  label,
  href,
  highlight,
  width = "w-64",
  children,
}: {
  label: string;
  href: string;
  highlight?: boolean;
  width?: string;
  children?: ReactNode;
}) {
  return (
    <li className="group relative">
      <Link
        href={href}
        className={`${TRIGGER} ${
          highlight ? "text-accent hover:text-accent" : "text-white/90 hover:text-accent"
        }`}
      >
        {label}
        {children && <ChevronDownIcon className="h-3.5 w-3.5" />}
      </Link>
      {children && (
        <div className={PANEL}>
          <div className={`${width} rounded-2xl border border-line bg-white p-2 shadow-drawer`}>
            {children}
          </div>
        </div>
      )}
    </li>
  );
}

/**
 * Navegación desktop. "Productos" abre un mega-menú con una columna por
 * categoría; Marcas, Combos, Ofertas y Contacto abren menús al pasar el mouse.
 */
export function Navbar() {
  const { categories } = useCategories();
  const { byCategory, onSale } = useProducts();
  const combos = byCategory("combos").slice(0, 8);
  const ofertas = onSale.slice(0, 8);

  return (
    <nav aria-label="Navegación principal" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {/* Mega-menú Productos */}
        <li className="group relative">
          <Link href="/productos" className={`${TRIGGER} text-white/90 hover:text-accent`}>
            Productos <ChevronDownIcon className="h-3.5 w-3.5" />
          </Link>

          <div className={PANEL}>
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

        {/* Marcas */}
        <Menu label="Marcas" href="/marcas" width="w-56">
          <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wide text-muted">
            Trabajamos con
          </p>
          {BRANDS.map((b) => (
            <Link key={b.value} href={`/productos?marca=${b.value}`} className={ITEM}>
              {b.label}
            </Link>
          ))}
        </Menu>

        {/* Combos: cada combo lleva directo a su ficha */}
        <Menu label="Combos" href="/productos?categoria=combos" width="w-72">
          {combos.length > 0 ? (
            combos.map((p) => (
              <Link key={p.id} href={`/producto?slug=${p.slug}`} className={ITEM}>
                <span className="block truncate">{p.name}</span>
                <span className="block text-xs font-bold text-primary">{formatPrice(p.price)}</span>
              </Link>
            ))
          ) : (
            <p className="px-3 py-2.5 text-sm text-muted">Pronto, nuevos combos.</p>
          )}
          <Link href="/productos?categoria=combos" className={FOOT}>
            Ver todos los combos →
          </Link>
        </Menu>

        {/* Ofertas: cada producto en oferta lleva directo a su ficha */}
        <Menu label="Ofertas" href="/ofertas" highlight width="w-80">
          {ofertas.length > 0 ? (
            ofertas.map((p) => (
              <Link key={p.id} href={`/producto?slug=${p.slug}`} className={ITEM}>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate">{p.name}</span>
                  <span className="shrink-0 rounded-full bg-sale px-2 py-0.5 text-[11px] font-bold text-white">
                    {p.discount}% OFF
                  </span>
                </span>
                <span className="block text-xs font-bold text-primary">
                  {formatPrice(p.price)}{" "}
                  {p.oldPrice && (
                    <span className="font-normal text-muted line-through">
                      {formatPrice(p.oldPrice)}
                    </span>
                  )}
                </span>
              </Link>
            ))
          ) : (
            <p className="px-3 py-2.5 text-sm text-muted">Por ahora no hay ofertas.</p>
          )}
          <Link href="/ofertas" className={FOOT}>
            Ver todas las ofertas →
          </Link>
        </Menu>

        {/* Contacto: WhatsApp, mail e Instagram, todos clickeables */}
        <Menu label="Contacto" href="/contacto" width="w-72">
          <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className={ITEM}>
            <span className="flex items-center gap-2.5">
              <WhatsappIcon className="h-5 w-5 shrink-0 text-[#25D366]" />
              <span>
                <span className="block">WhatsApp</span>
                <span className="block text-xs font-normal text-muted">{SITE.phone}</span>
              </span>
            </span>
          </a>
          <a href={`mailto:${SITE.email}`} className={ITEM}>
            <span className="flex items-center gap-2.5">
              <MailIcon className="h-5 w-5 shrink-0 text-primary" />
              <span>
                <span className="block">Email</span>
                <span className="block break-all text-xs font-normal text-muted">{SITE.email}</span>
              </span>
            </span>
          </a>
          <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className={ITEM}>
            <span className="flex items-center gap-2.5">
              <InstagramIcon className="h-5 w-5 shrink-0 text-primary" />
              <span>
                <span className="block">Instagram</span>
                <span className="block text-xs font-normal text-muted">@suplemarket.ar</span>
              </span>
            </span>
          </a>
          <Link href="/contacto" className={FOOT}>
            Ver página de contacto →
          </Link>
        </Menu>
      </ul>
    </nav>
  );
}
