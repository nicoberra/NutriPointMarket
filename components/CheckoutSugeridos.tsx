"use client";

import { useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { formatPrice } from "@/lib/format";
import { availableVariants } from "@/lib/stock";
import { categoriasDe } from "@/lib/categorias";
import type { Product } from "@/lib/types";
import { SmartImg } from "./SmartImg";

/** ¿Se puede sumar sin pasar por la ficha? (con stock y sin combos que pidan elegir). */
function sumable(p: Product): boolean {
  if (p.inStock === false) return false;
  if (p.stockQty != null && p.stockQty <= 0 && !p.variants?.length) return false;
  if (p.combo?.length) return false;
  if (p.variants?.length && !availableVariants(p).length) return false;
  return p.price > 0;
}

/** Sabores que se pueden elegir (con stock si se sigue el stock por sabor). */
function saboresDe(p: Product): string[] {
  if (p.variants?.length) return availableVariants(p);
  return p.flavors ?? [];
}

/**
 * «Sumá a tu pedido»: complementos reales de lo que hay en el carrito.
 * Primero lo que la tienda ya vende junto en algún combo (ej. proteína +
 * creatina), después lo más vendido de otras categorías. El precio es el de la
 * planilla y el servidor lo vuelve a calcular al confirmar.
 */
export function CheckoutSugeridos() {
  const { items, addItem } = useCart();
  const { products } = useProducts();

  const sugeridos = useMemo(() => {
    if (!items.length) return [];
    const enCarrito = new Set(items.map((i) => i.product.id));
    const nombresCarrito = new Set(items.map((i) => i.product.name));
    const catsCarrito = new Set(items.flatMap((i) => categoriasDe(i.product)));
    // Productos que algún combo vende junto con lo que hay en el carrito.
    const vanJuntos = new Set<string>();
    for (const c of products) {
      const nombres = (c.combo ?? []).map((x) => x.n);
      if (nombres.some((n) => nombresCarrito.has(n))) nombres.forEach((n) => vanJuntos.add(n));
    }
    return products
      .filter((p) => !enCarrito.has(p.id) && !nombresCarrito.has(p.name) && sumable(p))
      .map((p) => ({
        p,
        puntos:
          (vanJuntos.has(p.name) ? 4 : 0) +
          (categoriasDe(p).some((c) => catsCarrito.has(c)) ? 0 : 1) +
          (p.bestSeller ? 1 : 0),
      }))
      .filter((x) => x.puntos > 0)
      .sort((a, b) => b.puntos - a.puntos || a.p.price - b.p.price)
      .slice(0, 3)
      .map((x) => x.p);
  }, [items, products]);

  if (!sugeridos.length) return null;

  return (
    <section aria-labelledby="sumar-titulo" className="mt-4 border-t border-line pt-4">
      <h3 id="sumar-titulo" className="text-sm font-bold text-ink">
        Sumá a tu pedido
      </h3>
      <ul className="mt-2 space-y-2">
        {sugeridos.map((p) => (
          <Sugerido key={p.id} p={p} sumar={(flavor) => addItem(p, { flavor, openDrawer: false })} />
        ))}
      </ul>
    </section>
  );
}

function Sugerido({ p, sumar }: { p: Product; sumar: (flavor?: string) => void }) {
  const sabores = saboresDe(p);
  const [sabor, setSabor] = useState(sabores[0] ?? "");
  const [listo, setListo] = useState(false);
  const foto = p.image || p.images?.[0];
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line p-2">
      {foto && (
        <SmartImg src={foto} alt="" width={48} height={48} className="h-12 w-12 shrink-0 rounded-md bg-page-soft object-contain" />
      )}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-xs font-semibold leading-snug text-ink">{p.name}</p>
        <p className="text-xs font-bold text-primary">{formatPrice(p.price)}</p>
        {sabores.length > 1 && (
          <select
            value={sabor}
            onChange={(e) => setSabor(e.target.value)}
            aria-label={`Sabor de ${p.name}`}
            className="mt-1 h-8 w-full rounded-md border border-line bg-white px-1.5 text-xs text-ink"
          >
            {sabores.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          sumar(sabores.length ? sabor : undefined);
          setListo(true);
          window.setTimeout(() => setListo(false), 1500);
        }}
        className="btn btn-outline btn-sm shrink-0 transition-transform active:scale-[0.97]"
      >
        {listo ? "Sumado ✓" : "Sumar"}
      </button>
    </li>
  );
}
