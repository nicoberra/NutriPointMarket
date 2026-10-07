"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { ASSET_PREFIX, SITE } from "@/lib/config";
import { Logo } from "./Logo";
import { Navbar } from "./Navbar";
import { MobileMenu } from "./MobileMenu";
import { SearchBar } from "./SearchBar";
import { HeartIcon, InstagramIcon, MenuIcon, UserIcon } from "./Icons";

export function Header() {
  const { count, openCart, favorites } = useCart();
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  // Se compacta al scrollear (menos alto, más sombra) y vuelve arriba de todo.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // El contador del carrito rebota cuando suma un ítem.
  const [bump, setBump] = useState(false);
  const prevCount = useRef(count);
  useEffect(() => {
    if (count > prevCount.current) setBump(true);
    prevCount.current = count;
  }, [count]);

  return (
    <header
      className={`sticky top-0 z-50 bg-primary text-white transition-shadow duration-200 ${
        compact ? "shadow-lg" : "shadow-md"
      }`}
    >
      <div className="container-page">
        {/* Fila principal (el padding se achica al scrollear) */}
        <div
          className={`flex items-center gap-2 transition-[padding] duration-200 ease-move motion-reduce:transition-none sm:gap-3 ${
            compact ? "py-1.5" : "py-3"
          }`}
        >
          {/* Hamburguesa (mobile) */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú"
            className="-ml-1.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white/90 hover:bg-white/10 lg:hidden"
          >
            <MenuIcon className="h-6 w-6" />
          </button>

          <Logo
            variant="dark"
            className="shrink-0"
            wordmarkClassName="hidden lg:inline"
          />

          {/* Buscador (siempre visible, en el medio) */}
          <div className="mx-1 flex max-w-2xl flex-1 sm:mx-4">
            <SearchBar />
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Mi cuenta */}
            <Link
              href="/cuenta"
              className="hidden items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-white/90 transition-colors hover:bg-white/10 sm:flex"
            >
              <UserIcon className="h-6 w-6" />
              <span className="hidden text-xs leading-tight lg:block">
                <span className="block text-white/60">
                  {user ? "Hola," : "Ingresá /"}
                </span>
                <span className="block font-semibold">
                  {user ? user.name.split(" ")[0] : "Mi cuenta"}
                </span>
              </span>
            </Link>

            {/* Favoritos */}
            <Link
              href="/cuenta#favoritos"
              aria-label="Favoritos"
              className="relative hidden h-10 w-10 place-items-center rounded-lg text-white/90 transition-colors hover:bg-white/10 sm:grid"
            >
              <HeartIcon className="h-6 w-6" />
              {favorites.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-sale px-1 text-[10px] font-bold text-white">
                  {favorites.length}
                </span>
              )}
            </Link>

            {/* Carrito */}
            <button
              type="button"
              onClick={openCart}
              aria-label="Abrir carrito"
              data-cart-target
              className="relative grid h-10 w-10 place-items-center rounded-lg transition-colors hover:bg-white/10"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${ASSET_PREFIX}/carrito.png`}
                alt="Carrito"
                width={36}
                height={36}
                className="h-8 w-8 object-contain"
              />
              {count > 0 && (
                <span
                  onAnimationEnd={() => setBump(false)}
                  className={`absolute -right-0.5 -top-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-primary ${
                    bump ? "animate-badge-pop" : ""
                  }`}
                >
                  {count}
                </span>
              )}
            </button>

            {/* Instagram (a la derecha del carrito; en celu va en el menú) */}
            <a
              href={SITE.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram de Suple Market"
              title="Seguinos en Instagram"
              className="hidden h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)] text-white shadow-soft transition-transform hover:scale-105 sm:grid"
            >
              <InstagramIcon className="h-5 w-5" />
            </a>
          </div>
        </div>

        {/* Fila de navegación (desktop) */}
        <div className="hidden border-t border-white/10 lg:block">
          <Navbar />
        </div>
      </div>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}
