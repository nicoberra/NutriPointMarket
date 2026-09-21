"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { categoryMap } from "@/data/categories";
import { brandName } from "@/data/brands";
import { formatPrice } from "@/lib/format";
import { ProductVisual } from "./ProductVisual";
import { QuantitySelector } from "./QuantitySelector";
import { CartIcon, CloseIcon, TrashIcon, TruckIcon, ArrowRightIcon } from "./Icons";

const FREE_SHIPPING_THRESHOLD = 60000;

export function CartDrawer() {
  const { items, isOpen, closeCart, subtotal, setQuantity, removeItem, count } =
    useCart();
  const [zip, setZip] = useState("");
  const [shippingMsg, setShippingMsg] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  const calcShipping = () => {
    if (zip.trim().length < 4) {
      setShippingMsg("Ingresá un código postal válido.");
      return;
    }
    // Maqueta: envío ficticio
    setShippingMsg(
      subtotal >= FREE_SHIPPING_THRESHOLD
        ? "🎉 ¡Tenés envío gratis!"
        : `Envío estimado a CP ${zip.trim()}: ${formatPrice(4500)} (2 a 5 días hábiles).`,
    );
  };

  return (
    <>
      <div
        onClick={closeCart}
        className={`fixed inset-0 z-[80] bg-black/50 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      <aside
        className={`fixed right-0 top-0 z-[90] flex h-full w-full max-w-md flex-col bg-page shadow-drawer transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Carrito de compras"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-white px-4 py-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-primary">
            <CartIcon className="h-5 w-5" />
            Tu carrito
            {count > 0 && <span className="text-sm font-normal text-muted">({count})</span>}
          </h2>
          <button
            type="button"
            onClick={closeCart}
            aria-label="Cerrar carrito"
            className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-page-soft"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-page-soft text-muted">
              <CartIcon className="h-9 w-9" />
            </div>
            <div>
              <p className="font-semibold text-ink">Tu carrito está vacío</p>
              <p className="mt-1 text-sm text-muted">
                Sumá tus suplementos y aprovechá las ofertas del mes.
              </p>
            </div>
            <Link href="/productos" onClick={closeCart} className="btn btn-primary btn-md">
              Ver productos
            </Link>
          </div>
        ) : (
          <>
            {/* Barra de envío gratis */}
            <div className="border-b border-line bg-accent-soft px-4 py-3">
              {remaining > 0 ? (
                <p className="text-xs font-medium text-primary">
                  Te faltan <strong>{formatPrice(remaining)}</strong> para el envío gratis 🚚
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-xs font-bold text-primary">
                  <TruckIcon className="h-4 w-4" /> ¡Conseguiste el envío gratis!
                </p>
              )}
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <ul className="space-y-3">
                {items.map((item) => (
                  <li
                    key={item.key}
                    className="flex gap-3 rounded-lg border border-line bg-white p-2.5"
                  >
                    <Link
                      href={`/producto?slug=${item.product.slug}`}
                      onClick={closeCart}
                      className="shrink-0"
                    >
                      <ProductVisual
                        shape={categoryMap[item.product.category]?.shape ?? "tub"}
                        className="h-20 w-20 rounded-md"
                      />
                    </Link>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase text-muted">
                            {brandName(item.product.brand)}
                          </p>
                          <Link
                            href={`/producto?slug=${item.product.slug}`}
                            onClick={closeCart}
                            className="line-clamp-2 text-sm font-semibold text-ink hover:text-primary"
                          >
                            {item.product.name}
                          </Link>
                          {(item.flavor || item.presentation) && (
                            <p className="mt-0.5 text-xs text-muted">
                              {[item.flavor, item.presentation]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          aria-label="Eliminar"
                          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted hover:bg-page-soft hover:text-sale"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-2">
                        <QuantitySelector
                          size="sm"
                          value={item.quantity}
                          onChange={(v) => setQuantity(item.key, v)}
                        />
                        <span className="text-sm font-extrabold text-primary">
                          {formatPrice(item.product.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Calcular envío */}
              <div className="mt-4 rounded-lg border border-line bg-white p-3">
                <label className="text-xs font-semibold text-ink" htmlFor="cart-zip">
                  Calculá tu envío
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    id="cart-zip"
                    value={zip}
                    onChange={(e) => setZip(e.target.value)}
                    inputMode="numeric"
                    placeholder="Código postal"
                    className="input h-10 flex-1"
                  />
                  <button
                    type="button"
                    onClick={calcShipping}
                    className="btn btn-secondary btn-md shrink-0"
                  >
                    Calcular
                  </button>
                </div>
                {shippingMsg && (
                  <p className="mt-2 text-xs text-muted">{shippingMsg}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-line bg-white px-4 py-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-muted">Subtotal</span>
                <span className="font-display text-xl font-extrabold text-primary">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/carrito"
                  onClick={closeCart}
                  className="btn btn-outline btn-md"
                >
                  Ver carrito
                </Link>
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="btn btn-primary btn-md"
                >
                  Finalizar <ArrowRightIcon className="h-4 w-4" />
                </Link>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted">
                El checkout es una demostración por ahora.
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
