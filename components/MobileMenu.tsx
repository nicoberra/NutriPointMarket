"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SITE } from "@/lib/config";
import { useAuth } from "@/context/AuthContext";
import { useCategories } from "@/context/CategoriesContext";
import { Logo } from "./Logo";
import { SearchBar } from "./SearchBar";
import { ChevronDownIcon, CloseIcon, UserIcon } from "./Icons";

const SIMPLE = [
  { label: "Marcas", href: "/marcas" },
  { label: "Combos", href: "/productos?categoria=combos" },
  { label: "Ofertas", href: "/ofertas", highlight: true },
  { label: "Contacto", href: "/contacto" },
];

export function MobileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const { categories } = useCategories();
  const [prodOpen, setProdOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      <div
        className={`fixed left-0 top-0 z-[70] flex h-full w-[86%] max-w-sm flex-col bg-white shadow-drawer transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Menú"
      >
        <div className="flex items-center justify-between border-b border-line bg-primary px-4 py-3">
          <Logo variant="dark" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="grid h-9 w-9 place-items-center rounded-full text-white/90 hover:bg-white/10"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-line p-4">
          <SearchBar onNavigate={onClose} />
        </div>

        <nav className="flex-1 overflow-y-auto p-2" aria-label="Navegación mobile">
          <ul>
            {/* Productos (desplegable con categorías) */}
            <li className="border-b border-line/60">
              <div className="flex items-center">
                <Link
                  href="/productos"
                  onClick={onClose}
                  className="flex-1 px-3 py-3 text-[15px] font-semibold text-ink"
                >
                  Productos
                </Link>
                <button
                  type="button"
                  aria-label="Desplegar Productos"
                  onClick={() => setProdOpen((v) => !v)}
                  className="grid h-11 w-11 place-items-center text-muted"
                >
                  <ChevronDownIcon
                    className={`h-5 w-5 transition-transform ${prodOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
              {prodOpen && (
                <ul className="pb-2 pl-3">
                  {categories.map((c) => (
                    <li key={c.slug}>
                      <Link
                        href={`/productos?categoria=${c.slug}`}
                        onClick={onClose}
                        className="block rounded-md px-3 py-2 text-sm text-muted hover:bg-page-soft hover:text-primary"
                      >
                        {c.name}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      href="/productos"
                      onClick={onClose}
                      className="block rounded-md px-3 py-2 text-sm font-semibold text-primary hover:bg-page-soft"
                    >
                      Ver todos los productos
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {SIMPLE.map((item) => (
              <li key={item.label} className="border-b border-line/60 last:border-0">
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`block px-3 py-3 text-[15px] font-semibold ${
                    item.highlight ? "text-primary" : "text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-line p-4">
          <Link href="/cuenta" onClick={onClose} className="btn btn-outline btn-md w-full">
            <UserIcon className="h-4.5 w-4.5" />
            {user ? `Hola, ${user.name.split(" ")[0]}` : "Mi cuenta"}
          </Link>
          <p className="mt-3 text-center text-xs text-muted">{SITE.tagline}</p>
        </div>
      </div>
    </>
  );
}
