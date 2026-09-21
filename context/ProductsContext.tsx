"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product, CategorySlug } from "@/lib/types";
import { products as CATALOG } from "@/data/products";
import { fetchPrices, mergePrices } from "@/lib/api";

/**
 * Provee el catálogo combinado con los precios de la planilla.
 * - CATÁLOGO fijo (data/products.ts): nombre, categoría, descripción, fotos…
 * - PRECIOS (planilla): precio, stock, precio ML y destacado, cruzados por nombre.
 * Arranca con el catálogo (respaldo instantáneo), pinta desde cache y refresca
 * los precios en segundo plano. Editás la planilla → la web se actualiza sola.
 */

interface ProductsContextValue {
  products: Product[];
  loading: boolean;
  refresh: () => Promise<void>;
  getBySlug: (slug: string) => Product | undefined;
  getById: (id: string) => Product | undefined;
  byCategory: (c: CategorySlug) => Product[];
  featured: Product[];
  bestSellers: Product[];
  onSale: Product[];
}

const ProductsContext = createContext<ProductsContextValue | null>(null);
const CACHE_KEY = "npm-products-cache-v2";

const SEED: Product[] = CATALOG.map((p) => ({ ...p, inStock: true }));

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(SEED);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const prices = await fetchPrices();
    if (!prices.length) return;
    const merged = mergePrices(CATALOG, prices);
    setProducts(merged);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    // 1) Pintar desde cache al instante
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Product[];
        if (Array.isArray(parsed) && parsed.length) setProducts(parsed);
      }
    } catch {
      /* ignore */
    }
    // 2) Refrescar precios en segundo plano
    refresh()
      .catch(() => {
        /* se queda con cache o catálogo */
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  const value = useMemo<ProductsContextValue>(() => {
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    const byId = new Map(products.map((p) => [p.id, p]));
    return {
      products,
      loading,
      refresh,
      getBySlug: (slug) => bySlug.get(slug),
      getById: (id) => byId.get(id),
      byCategory: (c) => products.filter((p) => p.category === c),
      featured: products.filter((p) => p.featured),
      bestSellers: products.filter((p) => p.bestSeller),
      onSale: products.filter((p) => p.discount > 0),
    };
  }, [products, loading, refresh]);

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts(): ProductsContextValue {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts debe usarse dentro de <ProductsProvider>");
  return ctx;
}
