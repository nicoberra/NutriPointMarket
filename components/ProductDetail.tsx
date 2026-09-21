"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@/lib/types";
import { brandName, getBrand } from "@/data/brands";
import { categoryMap } from "@/data/categories";
import { formatPrice, installment } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { ProductVisual } from "./ProductVisual";
import { Rating } from "./Rating";
import { QuantitySelector } from "./QuantitySelector";
import { FavoriteButton } from "./FavoriteButton";
import {
  CartIcon,
  ShieldIcon,
  TruckIcon,
  CardIcon,
  StoreIcon,
  ChevronDownIcon,
} from "./Icons";

export function ProductDetail({ product }: { product: Product }) {
  const router = useRouter();
  const { addItem } = useCart();
  const shape = categoryMap[product.category]?.shape ?? "tub";

  const [flavor, setFlavor] = useState(product.flavors[0] ?? "");
  const [presentation, setPresentation] = useState(product.presentations?.[0] ?? "");
  const [qty, setQty] = useState(1);
  const [activeThumb, setActiveThumb] = useState(0);

  // Variaciones de color para simular una galería (placeholder)
  const gallery = ["rgb(var(--color-accent))", "rgb(var(--color-secondary))", "rgb(var(--color-primary-soft))"];

  const add = () =>
    addItem(product, {
      flavor: flavor || undefined,
      presentation: presentation || undefined,
      quantity: qty,
    });

  const buyNow = () => {
    add();
    router.push("/checkout");
  };

  return (
    <div className="container-page py-8">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Galería */}
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-line bg-page-soft">
            {product.discount > 0 && (
              <span className="badge absolute left-4 top-4 z-10 bg-sale text-white">
                {product.discount}% OFF
              </span>
            )}
            <FavoriteButton id={product.id} className="absolute right-4 top-4 z-10 h-11 w-11" />
            <ProductVisual
              shape={shape}
              brandLabel={getBrand(product.brand)?.label}
              accent={gallery[activeThumb]}
              className="aspect-square w-full"
            />
          </div>
          <div className="mt-3 flex gap-3">
            {gallery.map((c, i) => (
              <button
                key={i}
                onClick={() => setActiveThumb(i)}
                aria-label={`Vista ${i + 1}`}
                className={`overflow-hidden rounded-lg border-2 transition-colors ${
                  activeThumb === i ? "border-accent" : "border-line"
                }`}
              >
                <ProductVisual shape={shape} accent={c} className="h-20 w-20" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-muted">
            {brandName(product.brand)}
          </p>
          <h1 className="mt-1 font-display text-2xl font-extrabold leading-tight text-primary sm:text-3xl">
            {product.name}
          </h1>
          <div className="mt-2.5">
            <Rating value={product.rating} reviews={product.reviews} size="md" />
          </div>

          {/* Precio */}
          <div className="mt-5 rounded-xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-end gap-3">
              <span className="font-display text-3xl font-black text-primary">
                {formatPrice(product.price)}
              </span>
              {product.oldPrice && (
                <span className="mb-1 text-lg text-muted line-through">
                  {formatPrice(product.oldPrice)}
                </span>
              )}
              {product.discount > 0 && (
                <span className="mb-1 rounded-md bg-accent-soft px-2 py-0.5 text-sm font-bold text-primary">
                  Ahorrás {product.discount}%
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-muted">
              Hasta 12 cuotas de{" "}
              <span className="font-semibold text-ink">{installment(product.price)}</span>
            </p>
            {product.freeShipping && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
                <TruckIcon className="h-4.5 w-4.5" /> Envío gratis
              </p>
            )}
          </div>

          {/* Selectores */}
          <div className="mt-5 space-y-4">
            {product.flavors.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-bold text-ink">
                  Sabor: <span className="font-normal text-muted">{flavor}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.flavors.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFlavor(f)}
                      className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                        flavor === f
                          ? "border-accent bg-accent-soft text-primary"
                          : "border-line bg-white text-muted hover:border-accent"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.presentations && product.presentations.length > 1 && (
              <div>
                <p className="mb-2 text-sm font-bold text-ink">
                  Presentación:{" "}
                  <span className="font-normal text-muted">{presentation}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.presentations.map((pres) => (
                    <button
                      key={pres}
                      onClick={() => setPresentation(pres)}
                      className={`rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                        presentation === pres
                          ? "border-accent bg-accent-soft text-primary"
                          : "border-line bg-white text-muted hover:border-accent"
                      }`}
                    >
                      {pres}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Cantidad + acciones */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <QuantitySelector value={qty} onChange={setQty} />
            <span
              className={`text-xs font-medium ${
                product.stock > 5 ? "text-accent" : "text-sale"
              }`}
            >
              {product.stock > 0
                ? product.stock > 5
                  ? "En stock"
                  : `¡Últimas ${product.stock} unidades!`
                : "Sin stock"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button onClick={add} className="btn btn-primary btn-lg">
              <CartIcon className="h-5 w-5" /> Agregar al carrito
            </button>
            <button onClick={buyNow} className="btn btn-secondary btn-lg">
              Comprar ahora
            </button>
          </div>

          {/* Info de confianza */}
          <ul className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-line bg-page-soft p-4 text-xs text-muted">
            <li className="flex items-center gap-2">
              <ShieldIcon className="h-5 w-5 text-primary" /> Producto original
            </li>
            <li className="flex items-center gap-2">
              <CardIcon className="h-5 w-5 text-primary" /> Todos los medios de pago
            </li>
            <li className="flex items-center gap-2">
              <TruckIcon className="h-5 w-5 text-primary" /> Envíos a todo el país
            </li>
            <li className="flex items-center gap-2">
              <StoreIcon className="h-5 w-5 text-primary" /> Retiro en el local
            </li>
          </ul>
        </div>
      </div>

      {/* Tabs / Accordion */}
      <ProductTabs product={product} />
    </div>
  );
}

/* ------------------------- Tabs (desktop) / Accordion (mobile) ------------- */

function ProductTabs({ product }: { product: Product }) {
  const tabs = [
    {
      id: "descripcion",
      label: "Descripción",
      content: (
        <p>
          {product.description} Presentado por {brandName(product.brand)}, este
          producto forma parte de nuestra selección de suplementos originales,
          pensados para acompañar tus objetivos de rendimiento y bienestar.
        </p>
      ),
    },
    {
      id: "nutricional",
      label: "Información nutricional",
      content: (
        <div>
          <p className="mb-3">Valores de referencia por porción (información de demostración):</p>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Energía", "120 kcal"],
              ["Proteínas", "24 g"],
              ["Carbohidratos", "3 g"],
              ["Grasas", "1.5 g"],
            ].map(([k, v]) => (
              <li key={k} className="rounded-lg border border-line bg-white p-3 text-center">
                <span className="block text-xs text-muted">{k}</span>
                <span className="block font-bold text-primary">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      id: "uso",
      label: "Modo de uso",
      content: (
        <p>
          Mezclar una porción con 200–300 ml de agua o la bebida de tu preferencia.
          Consumir según tus objetivos y actividad física. Ante cualquier duda,
          consultá con un profesional de la salud.
        </p>
      ),
    },
    {
      id: "ingredientes",
      label: "Ingredientes",
      content: (
        <p>
          Información de demostración. Consultá siempre la etiqueta del envase para
          conocer los ingredientes, alérgenos y advertencias específicas del producto.
        </p>
      ),
    },
    {
      id: "faq",
      label: "Preguntas frecuentes",
      content: (
        <ul className="space-y-3">
          <li>
            <p className="font-semibold text-ink">¿Los productos son originales?</p>
            <p>Sí, trabajamos solo con distribuidores oficiales.</p>
          </li>
          <li>
            <p className="font-semibold text-ink">¿Hacen envíos?</p>
            <p>Enviamos a todo el país. También podés retirar en el local.</p>
          </li>
        </ul>
      ),
    },
  ];

  const [active, setActive] = useState(tabs[0].id);
  const [open, setOpen] = useState<string | null>(tabs[0].id);

  return (
    <div className="mt-12">
      {/* Desktop: tabs */}
      <div className="hidden lg:block">
        <div className="flex flex-wrap gap-1 border-b border-line">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              className={`-mb-px border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                active === t.id
                  ? "border-accent text-primary"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="prose-sm max-w-none py-6 text-sm leading-relaxed text-muted">
          {tabs.find((t) => t.id === active)?.content}
        </div>
      </div>

      {/* Mobile: accordion */}
      <div className="divide-y divide-line rounded-xl border border-line lg:hidden">
        {tabs.map((t) => {
          const isOpen = open === t.id;
          return (
            <div key={t.id}>
              <button
                onClick={() => setOpen(isOpen ? null : t.id)}
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <span className="text-sm font-bold text-ink">{t.label}</span>
                <ChevronDownIcon
                  className={`h-5 w-5 text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-sm leading-relaxed text-muted">
                  {t.content}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
