"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { brandName } from "@/data/brands";
import { categoryMap } from "@/data/categories";
import { formatPrice } from "@/lib/format";
import { PageBanner } from "@/components/PageBanner";
import { ProductVisual } from "@/components/ProductVisual";
import { QuantitySelector } from "@/components/QuantitySelector";
import { TrashIcon, ArrowRightIcon, CartIcon } from "@/components/Icons";

export default function CarritoPage() {
  const { items, subtotal, setQuantity, removeItem, count } = useCart();

  return (
    <>
      <PageBanner title="Tu carrito" crumbs={[{ label: "Carrito" }]} />
      <div className="container-page py-10">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white py-20 text-center">
            <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-page-soft text-muted">
              <CartIcon className="h-8 w-8" />
            </span>
            <p className="font-semibold text-ink">Tu carrito está vacío</p>
            <Link href="/productos" className="btn btn-primary btn-md mt-4">
              Ver productos
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            {/* Lista */}
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.key}
                  className="flex gap-4 rounded-xl border border-line bg-white p-3 sm:p-4"
                >
                  <Link href={`/producto?slug=${item.product.slug}`} className="shrink-0">
                    <ProductVisual
                      shape={categoryMap[item.product.category]?.shape ?? "tub"}
                      className="h-24 w-24 rounded-lg sm:h-28 sm:w-28"
                    />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="text-[11px] font-bold uppercase text-muted">
                      {brandName(item.product.brand)}
                    </p>
                    <Link
                      href={`/producto?slug=${item.product.slug}`}
                      className="text-sm font-semibold text-ink hover:text-accent sm:text-base"
                    >
                      {item.product.name}
                    </Link>
                    {(item.flavor || item.presentation) && (
                      <p className="mt-0.5 text-xs text-muted">
                        {[item.flavor, item.presentation].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                      <QuantitySelector
                        value={item.quantity}
                        onChange={(v) => setQuantity(item.key, v)}
                      />
                      <div className="flex items-center gap-4">
                        <span className="font-display text-lg font-extrabold text-primary">
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                        <button
                          onClick={() => removeItem(item.key)}
                          aria-label="Eliminar"
                          className="grid h-9 w-9 place-items-center rounded-md text-muted hover:bg-page-soft hover:text-sale"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen */}
            <aside className="lg:sticky lg:top-40 lg:self-start">
              <div className="rounded-xl border border-line bg-white p-5">
                <h2 className="font-display text-lg font-bold text-primary">
                  Resumen de compra
                </h2>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Productos ({count})</dt>
                    <dd className="font-medium text-ink">{formatPrice(subtotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Envío</dt>
                    <dd className="font-medium text-ink">A calcular</dd>
                  </div>
                </dl>
                <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                  <span className="font-semibold text-ink">Total</span>
                  <span className="font-display text-2xl font-black text-primary">
                    {formatPrice(subtotal)}
                  </span>
                </div>
                <Link href="/checkout" className="btn btn-primary btn-lg mt-5 w-full">
                  Finalizar compra <ArrowRightIcon className="h-5 w-5" />
                </Link>
                <Link
                  href="/productos"
                  className="mt-3 block text-center text-sm font-semibold text-primary hover:text-accent"
                >
                  Seguir comprando
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
