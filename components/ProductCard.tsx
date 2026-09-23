"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { brandName } from "@/data/brands";
import { categoryMap } from "@/data/categories";
import { formatPrice } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { ProductVisual } from "./ProductVisual";
import { FavoriteButton } from "./FavoriteButton";
import { CartIcon, TruckIcon } from "./Icons";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const hasFlavors = product.flavors.length > 0;
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
          <ProductVisual
            shape={shape}
            brandLabel={
              product.brand ? product.brand.split(" ")[0].toUpperCase().slice(0, 7) : undefined
            }
            className="aspect-square w-full transition-transform duration-500 group-hover:scale-[1.06]"
          />
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
        <div className="mt-2 flex items-end gap-2">
          <span className="text-lg font-extrabold text-primary">
            {formatPrice(product.price)}
          </span>
          {product.oldPrice && (
            <span className="mb-0.5 text-sm text-muted line-through">
              {formatPrice(product.oldPrice)}
            </span>
          )}
        </div>
        {/* Selector de sabor */}
        {hasFlavors && (
          <label className="mt-3 block">
            <span className="sr-only">Sabor</span>
            <select
              value={flavor}
              onChange={(e) => setFlavor(e.target.value)}
              className="input h-9 cursor-pointer text-xs"
              aria-label={`Sabor de ${product.name}`}
            >
              {product.flavors.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* CTA */}
        <button
          type="button"
          disabled={product.inStock === false}
          onClick={() => addItem(product, { flavor: flavor || undefined })}
          className="btn btn-primary btn-md mt-3 w-full"
        >
          <CartIcon className="h-4.5 w-4.5" />
          {product.inStock === false ? "Sin stock" : "Agregar al carrito"}
        </button>
      </div>
    </article>
  );
}
