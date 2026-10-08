"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { brandName } from "@/data/brands";
import { categoryMap } from "@/data/categories";
import { formatPrice } from "@/lib/format";
import { transferPrice } from "@/lib/config";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { availableVariants, comboComponents, comboStockMax } from "@/lib/stock";
import { flyToCart } from "@/lib/motion";
import { ProductVisual } from "./ProductVisual";
import { Rating } from "./Rating";
import { QuantitySelector } from "./QuantitySelector";
import { FavoriteButton } from "./FavoriteButton";
import { SmartImg } from "@/components/SmartImg";
import {
  CartIcon,
  ShieldIcon,
  TruckIcon,
  CardIcon,
  PercentIcon,
  WhatsappIcon,
  ChevronDownIcon,
} from "./Icons";

export function ProductDetail({ product: initial }: { product: Product }) {
  const router = useRouter();
  const { addItem } = useCart();
  const { getBySlug, products: allProducts } = useProducts();
  // Usa la versión en vivo de la planilla si está disponible; si no, el respaldo.
  const product = getBySlug(initial.slug) ?? initial;
  const shape = categoryMap[product.category]?.shape ?? "tub";

  // Combos: el cliente elige la variante de cada producto que la tenga (solo
  // se ofrecen las que tienen stock) y el stock del combo sale de esa elección.
  const isCombo = !!product.combo?.length;
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
  const comboMax = isCombo ? comboStockMax(product, allProducts, choices) : null;

  const variantQty = (name: string): number | null => {
    const v = product.variants?.find((x) => x.name === name);
    return v ? v.qty : null;
  };
  const [flavor, setFlavor] = useState(() => {
    const avail = product.flavors.find((f) => {
      const q = variantQty(f);
      return q == null || q > 0;
    });
    return avail ?? product.flavors[0] ?? "";
  });
  const [presentation, setPresentation] = useState(product.presentations?.[0] ?? "");
  const [qty, setQty] = useState(1);
  const [activeThumb, setActiveThumb] = useState(0);

  const selQty = variantQty(flavor);
  const soldOut =
    product.inStock === false ||
    (selQty !== null && selQty <= 0) ||
    (comboMax !== null && comboMax <= 0);
  // Máximo que se puede comprar: en combos, según las variantes elegidas; si
  // no, el stock de la variante elegida o el total del producto. Sin
  // seguimiento → 99.
  const maxQty =
    comboMax !== null
      ? Math.max(1, comboMax)
      : selQty !== null
        ? Math.max(1, selQty)
        : (product.stockQty ?? 0) > 0
          ? (product.stockQty as number)
          : 99;

  // Al cambiar la elección del combo, no pasarse del stock disponible.
  useEffect(() => {
    if (comboMax !== null) setQty((cur) => Math.min(Math.max(1, cur), Math.max(1, comboMax)));
  }, [comboMax]);

  // Galería: por defecto las fotos principales; al elegir una variante con
  // fotos, se muestran las de esa variante.
  const variantPhotos = product.variantImages?.[flavor] ?? [];
  const displayPhotos = variantPhotos.length ? variantPhotos : product.images ?? [];
  const mainImage = displayPhotos[activeThumb] ?? product.image;

  // Al cambiar de variante, volver a la primera foto y ajustar la cantidad al
  // stock de esa variante (para no pasarse).
  useEffect(() => {
    setActiveThumb(0);
    const q = variantQty(flavor);
    const m = q !== null ? q : (product.stockQty ?? 0) > 0 ? (product.stockQty as number) : 99;
    setQty((cur) => Math.min(Math.max(1, cur), Math.max(1, m)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flavor]);

  // Variaciones de color para simular una galería (placeholder)
  const gallery = ["rgb(var(--color-accent))", "rgb(var(--color-secondary))", "rgb(var(--color-primary-soft))"];

  const add = (openDrawer?: boolean) =>
    addItem(product, {
      flavor: flavor || undefined,
      presentation: presentation || undefined,
      quantity: qty,
      comboChoices: comboComps.length ? choices : undefined,
      openDrawer: openDrawer !== false,
    });

  // "Comprar ahora": directo al checkout, sin abrir el cajón del carrito.
  const buyNow = () => {
    add(false);
    router.push("/checkout");
  };

  return (
    <div className="container-page py-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
        {/* Galería */}
        <div>
          <div className="relative mx-auto w-full max-w-[440px] overflow-hidden rounded-2xl border border-line bg-page-soft lg:max-w-[500px]">
            {product.discount > 0 && (
              <span className="badge absolute left-4 top-4 z-10 bg-sale text-white">
                {product.discount}% OFF
              </span>
            )}
            <FavoriteButton id={product.id} className="absolute right-4 top-4 z-10 h-11 w-11" />
            {mainImage ? (
              <SmartImg
                data-detail-image
                src={mainImage}
                sizes="(max-width: 1024px) 100vw, 560px"
                fetchPriority="high"
                alt={product.name}
                decoding="async"
                className="aspect-square w-full object-cover"
              />
            ) : (
              <ProductVisual
                shape={shape}
                brandLabel={
                  product.brand ? product.brand.split(" ")[0].toUpperCase().slice(0, 7) : undefined
                }
                accent={gallery[activeThumb % gallery.length]}
                className="aspect-square w-full"
              />
            )}
          </div>
          {displayPhotos.length > 1 && (
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              {displayPhotos.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setActiveThumb(i)}
                  aria-label={`Foto ${i + 1}`}
                  className={`overflow-hidden rounded-lg border-2 transition-colors ${
                    activeThumb === i ? "border-accent" : "border-line"
                  }`}
                >
                  <SmartImg src={src} alt="" sizes="80px" loading="lazy" decoding="async" className="h-20 w-20 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-muted">
            {brandName(product.brand)}
          </p>
          <h1 className="mt-1 font-display text-2xl font-extrabold leading-tight text-primary sm:text-3xl">
            {product.name}
          </h1>
          {product.reviews > 0 && (
            <div className="mt-2.5">
              <Rating value={product.rating} reviews={product.reviews} size="md" />
            </div>
          )}

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
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
              <PercentIcon className="h-4.5 w-4.5" /> Con transferencia:{" "}
              <b>{formatPrice(product.basePrice ?? transferPrice(product.price))}</b> (10% de descuento)
            </p>
            {product.freeShipping && (
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                <TruckIcon className="h-4.5 w-4.5" /> Envío gratis
              </p>
            )}
          </div>

          {/* Selectores */}
          <div className="mt-5 space-y-4">
            {product.flavors.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-bold text-ink">
                  Variante: <span className="font-normal text-muted">{flavor}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.flavors.map((f) => {
                    const q = variantQty(f);
                    const out = q !== null && q <= 0;
                    return (
                      <button
                        key={f}
                        onClick={() => !out && setFlavor(f)}
                        disabled={out}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          out
                            ? "cursor-not-allowed border-line bg-page-soft text-muted line-through opacity-50"
                            : flavor === f
                              ? "border-accent bg-accent-soft text-primary"
                              : "border-line bg-white text-muted hover:border-accent"
                        }`}
                      >
                        {f}
                        {out ? " · sin stock" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Combo: elegir la variante de cada producto que la tenga */}
            {comboComps.map(({ comp, q }) => {
              const avail = availableVariants(comp);
              return (
                <div key={comp.name}>
                  <p className="mb-2 text-sm font-bold text-ink">
                    {comp.name}
                    {q > 1 ? ` ×${q}` : ""}:{" "}
                    <span className="font-normal text-muted">
                      {choices[comp.name] || "elegí una opción"}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {comp.flavors.map((f) => {
                      const out = !avail.includes(f);
                      const sel = choices[comp.name] === f;
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={() => !out && setChoices((c) => ({ ...c, [comp.name]: f }))}
                          disabled={out}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                            out
                              ? "cursor-not-allowed border-line bg-page-soft text-muted line-through opacity-50"
                              : sel
                                ? "border-accent bg-accent-soft text-primary"
                                : "border-line bg-white text-muted hover:border-accent"
                          }`}
                        >
                          {f}
                          {out ? " · sin stock" : ""}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

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
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
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
            <QuantitySelector value={qty} onChange={setQty} max={maxQty} />
            <span
              className={`text-xs font-bold ${
                soldOut || maxQty === 1 ? "text-sale" : "text-primary"
              }`}
            >
              {soldOut
                ? "Sin stock"
                : maxQty === 1
                  ? "¡Última unidad!"
                  : comboMax !== null
                  ? comboMax < 99
                    ? `Quedan ${comboMax}`
                    : "En stock"
                  : selQty !== null
                    ? `Quedan ${selQty}`
                    : "En stock"}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => {
                flyToCart(document.querySelector("[data-detail-image]"));
                add();
              }}
              disabled={soldOut}
              className="btn btn-primary btn-lg"
            >
              <CartIcon className="h-5 w-5" />
              {soldOut ? "Sin stock" : "Agregar al carrito"}
            </button>
            <button onClick={buyNow} disabled={soldOut} className="btn btn-secondary btn-lg">
              Comprar ahora
            </button>
          </div>

          {/* Info de confianza */}
          <ul className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-line bg-page-soft p-4 text-xs text-muted">
            <li className="flex items-center gap-2">
              <ShieldIcon className="h-5 w-5 text-primary" /> Producto original
            </li>
            <li className="flex items-center gap-2">
              <PercentIcon className="h-5 w-5 text-primary" /> 10% de descuento por transferencia
            </li>
            <li className="flex items-center gap-2">
              <CardIcon className="h-5 w-5 text-primary" /> Pago seguro
            </li>
            <li className="flex items-center gap-2">
              <WhatsappIcon className="h-5 w-5 text-primary" /> Coordinás por WhatsApp
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
  // Solo se muestran las secciones que tengan contenido (cargadas desde el CRM).
  const tabs = [
    ...(product.description
      ? [
          {
            id: "descripcion",
            label: "Descripción",
            content: <p className="whitespace-pre-line">{product.description}</p>,
          },
        ]
      : []),
    ...(product.usage
      ? [
          {
            id: "uso",
            label: "Modo de uso",
            content: <p className="whitespace-pre-line">{product.usage}</p>,
          },
        ]
      : []),
    ...(product.nutrition
      ? [
          {
            id: "nutricional",
            label: "Información nutricional",
            content: <p className="whitespace-pre-line">{product.nutrition}</p>,
          },
        ]
      : []),
    ...(product.ingredients
      ? [
          {
            id: "ingredientes",
            label: "Ingredientes",
            content: <p className="whitespace-pre-line">{product.ingredients}</p>,
          },
        ]
      : []),
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
            <p className="font-semibold text-ink">¿Cómo lo recibo?</p>
            <p>Coordinamos la entrega o el envío por WhatsApp según tu zona.</p>
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
