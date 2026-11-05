"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { PROMO_DESTACADOS, transferPrice } from "@/lib/config";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { comboComponents } from "@/lib/stock";
import { flyToCart } from "@/lib/motion";
import { SmartImg } from "@/components/SmartImg";
import { ProductVisual } from "./ProductVisual";
import { categoryMap } from "@/data/categories";

/**
 * Sección de promos de la home (modelo "Cuenta regresiva"): arriba un bloque
 * azul con la cuenta regresiva hasta el fin de la promo vigente y abajo los
 * productos destacados en tarjetas. Cuando la promo termina, la cuenta se
 * apaga sola y el bloque pasa a "Nuestros elegidos del mes".
 *
 * La cuenta se calcula en el navegador después de montar (el HTML estático del
 * build no sabe la hora), así no hay diferencias de hidratación.
 */
const FIN = new Date(PROMO_DESTACADOS.hasta).getTime();

function partes(ms: number) {
  const min = Math.max(0, Math.floor(ms / 60000));
  return { d: Math.floor(min / 1440), h: Math.floor((min % 1440) / 60), m: min % 60 };
}
const dos = (n: number) => String(n).padStart(2, "0");

/** "domingo 8/11 a las 23:59" (hora argentina). */
function finTexto(): string {
  const f = new Date(FIN);
  const dia = new Intl.DateTimeFormat("es-AR", { weekday: "long", timeZone: "America/Argentina/Buenos_Aires" }).format(f);
  const dm = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(f);
  const hm = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Argentina/Buenos_Aires" }).format(f);
  return `${dia} ${dm} a las ${hm}`;
}

export function PromoCuentaRegresiva({ products }: { products: Product[] }) {
  // null hasta montar: el servidor y el primer render del cliente coinciden.
  const [restante, setRestante] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setRestante(FIN - Date.now());
    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, []);
  const enPromo = restante !== null && restante > 0;
  const { d, h, m } = partes(restante ?? 0);
  const lista = products.filter((p) => p.image);

  return (
    <section id="elegidos" className="container-page scroll-mt-28 py-10 sm:py-14" aria-labelledby="promo-titulo">
      <div className="relative overflow-hidden rounded-[28px] bg-primary px-6 py-7 text-white sm:px-10 sm:py-9">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgb(var(--color-accent)/0.35),transparent_65%)]"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 id="promo-titulo" className="font-display text-lg font-bold text-white/85 sm:text-xl">
              {enPromo ? `La Promo ${PROMO_DESTACADOS.nombre} termina en` : "Nuestros elegidos del mes"}
            </h2>
            {enPromo ? (
              <div className="mt-2 flex items-end gap-2 sm:gap-4" role="timer" aria-live="off" aria-label={`Faltan ${d} días, ${h} horas y ${m} minutos`}>
                {[
                  [dos(d), d === 1 ? "día" : "días"],
                  [dos(h), h === 1 ? "hora" : "horas"],
                  [dos(m), m === 1 ? "minuto" : "minutos"],
                ].map(([n, l], i) => (
                  <div key={l} className="flex items-end gap-2 sm:gap-4">
                    {i > 0 && (
                      <span aria-hidden className="pb-6 font-display text-[clamp(2.5rem,10vw,6rem)] font-extrabold leading-[0.85] text-secondary sm:pb-8">
                        :
                      </span>
                    )}
                    <div className="flex flex-col">
                      <span className="font-display text-[clamp(3.5rem,15vw,8rem)] font-extrabold leading-[0.85] tracking-[-0.05em] text-accent tabular-nums">
                        {n}
                      </span>
                      <span className="mt-2 text-xs font-semibold text-white/75 sm:text-sm">{l}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 font-display text-[clamp(2.25rem,7vw,4.5rem)] font-extrabold leading-[0.95] tracking-tight text-accent">
                Lo más elegido
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 text-sm sm:text-base lg:items-end lg:text-right">
            {enPromo && <p className="text-white">Hasta el {finTexto()}.</p>}
            <Link href="/productos?orden=destacados" className="font-semibold text-accent underline-offset-4 hover:underline">
              Ver todos
            </Link>
          </div>
        </div>
      </div>

      <ul className={`mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4 md:grid-cols-3 ${lista.length >= 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
        {lista.map((p) => (
          <li key={p.id}>
            <Tarjeta product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function Tarjeta({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { products: todos } = useProducts();
  const imgRef = useRef<HTMLImageElement>(null);
  // Con sabores (o combo con sabores a elegir) se elige en la ficha.
  const eligeSabor = product.flavors.length > 0 || comboComponents(product, todos).some(({ comp }) => comp.flavors.length > 0);
  const sinStock = product.inStock === false;
  const ficha = `/producto/${product.slug}/`;
  const shape = categoryMap[product.category]?.shape ?? "tub";
  return (
    <article className="group flex h-full flex-col rounded-[20px] bg-white p-2.5 pb-3.5 shadow-card transition-[transform,box-shadow] duration-300 ease-enter hover:-translate-y-1 hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <Link href={ficha} className="relative block overflow-hidden rounded-[14px] bg-page-soft" aria-label={product.name}>
        {product.image ? (
          <SmartImg
            ref={imgRef}
            src={product.image}
            alt={product.name}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
            loading="lazy"
            decoding="async"
            className="aspect-square w-full object-cover transition-transform duration-500 ease-enter group-hover:scale-[1.05] motion-reduce:transition-none"
          />
        ) : (
          <ProductVisual shape={shape} className="aspect-square w-full" />
        )}
        {product.discount > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-primary px-2.5 py-1 font-display text-xs font-extrabold text-accent">
            −{product.discount}%
          </span>
        )}
      </Link>
      <h3 className="mt-2.5 line-clamp-2 min-h-[2.5rem] font-display text-sm font-bold leading-tight text-ink sm:text-[15px]">
        <Link href={ficha} className="hover:text-primary">
          {product.name}
        </Link>
      </h3>
      <p className="mt-1.5 font-display text-lg font-extrabold text-ink">{formatPrice(product.price)}</p>
      <p className="text-xs font-semibold text-muted">
        {formatPrice(product.basePrice ?? transferPrice(product.price))} con transferencia
      </p>
      <div className="mt-auto pt-2.5">
        {sinStock ? (
          <span className="btn btn-md w-full cursor-default bg-page-soft text-muted">Sin stock</span>
        ) : eligeSabor ? (
          <Link href={ficha} className="btn btn-md w-full bg-accent font-bold text-primary hover:brightness-105">
            Elegir sabor
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              flyToCart(imgRef.current);
              addItem(product);
            }}
            className="btn btn-md w-full bg-accent font-bold text-primary hover:brightness-105"
          >
            Agregar
          </button>
        )}
      </div>
    </article>
  );
}
