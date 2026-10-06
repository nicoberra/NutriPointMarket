"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { brandName } from "@/data/brands";
import { categoryMap } from "@/data/categories";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { comboNeedsChoice } from "@/lib/stock";
import { ProductVisual } from "./ProductVisual";
import { FavoriteButton } from "./FavoriteButton";
import { CartIcon, TruckIcon } from "./Icons";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { products: allProducts } = useProducts();
  const router = useRouter();
  const hasFlavors = product.flavors.length > 0;
  // Combo con productos que tienen variantes: se eligen en la ficha.
  const needsChoice = comboNeedsChoice(product, allProducts);
  const [flavor, setFlavor] = useState<string>(product.flavors[0] ?? "");
  const shape = categoryMap[product.category]?.shape ?? "tub";

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-card-hover">
      {/* Media */}
      <div className="relative">
        {/* Etiquetas superiores */}
        <div className="absolute left-2.5 top-2.5 z-10 flex flex-col gap-1.5">
          {product.discount > 0 && (
            <span className="badge bg-sale text-white shadow-soft">
              {product.discount}% OFF
            </span>
          )}
          {product.freeShipping && (
            <span className="badge bg-accent text-primary shadow-soft">
              <TruckIcon className="h-3.5 w-3.5" /> Envío gratis
            </span>
          )}
          {product.isNew && !product.discount && (
            <span className="badge bg-primary text-white shadow-soft">Nuevo</span>
          )}
        </div>

        <FavoriteButton id={product.id} className="absolute right-2.5 top-2.5 z-10 h-9 w-9" />

        <Link
          href={`/producto?slug=${product.slug}`}
          className="block bg-page-soft"
          aria-label={product.name}
        >
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
            />
          ) : (
            <ProductVisual
              shape={shape}
              brandLabel={
                product.brand ? product.brand.split(" ")[0].toUpperCase().slice(0, 7) : undefined
              }
              className="aspect-square w-full transition-transform duration-500 group-hover:scale-[1.06]"
            />
          )}
        </Link>
      </div>

      {/* Contenido */}
      <div className="flex flex-1 flex-col p-3.5">
        <p className="text-[11px] font-bold uppercase tracking-wide text-muted">
          {brandName(product.brand)}
        </p>
        <h3 className="mt-0.5 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-ink">
          <Link href={`/producto?slug=${product.slug}`} className="hover:text-primary">
            {product.name}
          </Link>
        </h3>

        {/* Precios */}
        <div className="mt-2 flex min-h-[1.75rem] items-end gap-2">
          <span className="text-lg font-extrabold text-primary">
            {formatPrice(product.price)}
          </span>
          {product.oldPrice && (
            <span className="mb-0.5 text-sm text-muted line-through">
              {formatPrice(product.oldPrice)}
            </span>
          )}
        </div>
        {/* Selector de variante: píldora redondeada. Reserva el mismo alto en
            todas las tarjetas (tengan o no variantes) para que nada "salte". */}
        <div className="mt-3 min-h-[2.5rem]">
          {hasFlavors && (
            <label className="relative block">
              <span className="sr-only">Variante</span>
              <select
                value={flavor}
                onChange={(e) => setFlavor(e.target.value)}
                aria-label={`Variante de ${product.name}`}
                className="h-10 w-full cursor-pointer appearance-none rounded-full border border-line bg-page-soft pl-4 pr-10 text-xs font-semibold text-ink transition-colors hover:border-accent focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              >
                {product.flavors.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 8l4 4 4-4" />
              </svg>
            </label>
          )}
        </div>

        {/* CTA: siempre al pie de la tarjeta → botones alineados en toda la fila */}
        <div className="mt-auto space-y-2 pt-3">
          {needsChoice ? (
            <button
              type="button"
              disabled={product.inStock === false}
              onClick={() => router.push(`/producto?slug=${product.slug}`)}
              className="btn btn-primary btn-md w-full"
            >
              {product.inStock === false ? "Sin stock" : "Elegir sabores"}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={product.inStock === false}
                onClick={() => {
                  addItem(product, { flavor: flavor || undefined });
                  router.push("/checkout");
                }}
                className="btn btn-primary btn-md w-full"
              >
                {product.inStock === false ? "Sin stock" : "Comprar"}
              </button>
              <button
                type="button"
                disabled={product.inStock === false}
                onClick={() => addItem(product, { flavor: flavor || undefined })}
                className="btn btn-outline btn-md w-full whitespace-nowrap"
              >
                <CartIcon className="h-4.5 w-4.5" /> Agregar
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
