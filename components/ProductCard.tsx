"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { brandName } from "@/data/brands";
import { categoryMap } from "@/data/categories";
import { formatPrice } from "@/lib/format";
import { transferPrice } from "@/lib/config";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { availableVariants, comboComponents, comboStockMax } from "@/lib/stock";
import { ProductVisual } from "./ProductVisual";
import { VariantSelect } from "./VariantSelect";
import { FavoriteButton } from "./FavoriteButton";
import { CartIcon, TruckIcon } from "./Icons";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { products: allProducts } = useProducts();
  const router = useRouter();
  const hasFlavors = product.flavors.length > 0;
  // Combo: por cada producto del combo que tenga variantes, un selector en la
  // tarjeta (igual que un producto normal). Lo elegido viaja al carrito.
  const comboComps = comboComponents(product, allProducts).filter(
    ({ comp }) => comp.flavors.length > 0,
  );
  const [choices, setChoices] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      comboComps.map(({ comp }) => [
        comp.name,
        availableVariants(comp)[0] ?? comp.flavors[0] ?? "",
      ]),
    ),
  );
  const cartOpts = (openDrawer?: boolean) => ({
    flavor: flavor || undefined,
    comboChoices: comboComps.length ? choices : undefined,
    ...(openDrawer === false ? { openDrawer: false } : {}),
  });
  const [flavor, setFlavor] = useState<string>(product.flavors[0] ?? "");
  const shape = categoryMap[product.category]?.shape ?? "tub";
  // "Última unidad": queda exactamente 1 (de la variante elegida, del combo
  // según lo elegido, o del producto si no usa variantes).
  const selVar = product.variants?.find((v) => v.name === flavor);
  const lastOne =
    product.combo && product.combo.length
      ? comboStockMax(product, allProducts, choices) === 1
      : selVar && selVar.qty != null
        ? selVar.qty === 1
        : (product.stockQty ?? 0) === 1;

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
          {lastOne && product.inStock !== false && (
            <span className="badge bg-primary text-white shadow-soft">¡Última unidad!</span>
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
        <p className="mt-0.5 text-[11px] font-semibold text-green-700">
          Con transferencia: {formatPrice(transferPrice(product.price))}
        </p>
        {/* Selector de variante: píldora redondeada. Reserva el mismo alto en
            todas las tarjetas (tengan o no variantes) para que nada "salte". */}
        <div className="mt-3 min-h-[2.5rem]">
          {hasFlavors && (
            <VariantSelect
              value={flavor}
              options={product.flavors}
              disabledOptions={(product.variants ?? [])
                .filter((v) => v.qty != null && v.qty <= 0)
                .map((v) => v.name)}
              onChange={setFlavor}
              label={`Variante de ${product.name}`}
            />
          )}
          {comboComps.map(({ comp }) => (
            <div key={comp.name} className="mb-1.5 last:mb-0">
              {comboComps.length > 1 && (
                <p className="mb-0.5 truncate text-[10px] font-semibold text-muted">{comp.name}</p>
              )}
              <VariantSelect
                value={choices[comp.name] ?? ""}
                options={comp.flavors}
                disabledOptions={comp.flavors.filter((f) => !availableVariants(comp).includes(f))}
                onChange={(v) => setChoices((c) => ({ ...c, [comp.name]: v }))}
                label={`${comp.name} de ${product.name}`}
              />
            </div>
          ))}
        </div>

        {/* CTA: siempre al pie de la tarjeta → botones alineados en toda la fila */}
        <div className="mt-auto space-y-2 pt-3">
          <button
            type="button"
            disabled={product.inStock === false}
            onClick={() => {
              addItem(product, cartOpts(false));
              router.push("/checkout");
            }}
            className="btn btn-primary btn-md w-full"
          >
            {product.inStock === false ? "Sin stock" : "Comprar"}
          </button>
          <button
            type="button"
            disabled={product.inStock === false}
            onClick={() => addItem(product, cartOpts())}
            className="btn btn-outline btn-md w-full whitespace-nowrap"
          >
            <CartIcon className="h-4.5 w-4.5" /> Agregar
          </button>
        </div>
      </div>
    </article>
  );
}
