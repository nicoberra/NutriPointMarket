"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product, CategorySlug } from "@/lib/types";
import { products as SEED } from "@/data/products";
import { fetchProducts } from "@/lib/api";

/**
 * Provee el catálogo de productos a toda la tienda.
 * - Arranca con los productos demo (`data/products.ts`) como respaldo, así la
 *   web se ve al instante y funciona aunque la API falle.
 * - Lee un cache de localStorage (pintar-desde-cache-primero).
 * - Refresca en segundo plano desde la planilla de Google (Apps Script).
 * Resultado: editás precio/stock en Google Sheets y la web se actualiza sola.
 */

interface ProductsContextValue {
  products: Product[];
  loading: boolean;
  /** "seed" = demo | "cache" = localStorage | "live" = planilla */
  source: "seed" | "cache" | "live";
  getBySlug: (slug: string) => Product | undefined;
  getById: (id: string) => Product | undefined;
  byCategory: (c: CategorySlug) => Product[];
  featured: Product[];
  bestSellers: Product[];
  onSale: Product[];
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

const CACHE_KEY = "npm-products-cache-v1";

interface CacheShape {
  ts: number;
  products: Product[];
}

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(SEED);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"seed" | "cache" | "live">("seed");

  useEffect(() => {
    let cancelled = false;

    // 1) Pintar desde cache al instante (si existe), aunque después se refresque
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CacheShape;
        if (parsed?.products?.length) {
          setProducts(parsed.products);
          setSource("cache");
        }
      }
    } catch {
      /* ignore */
    }

    // 2) Refrescar SIEMPRE desde la planilla en segundo plano
    fetchProducts()
      .then((live) => {
        if (cancelled || !live.length) return;
        setProducts(live);
        setSource("live");
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ ts: Date.now(), products: live } as CacheShape),
          );
        } catch {
          /* ignore */
        }
      })
      .catch(() => {
        /* se queda con cache o seed */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<ProductsContextValue>(() => {
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    const byId = new Map(products.map((p) => [p.id, p]));
    return {
      products,
      loading,
      source,
      getBySlug: (slug) => bySlug.get(slug),
      getById: (id) => byId.get(id),
      byCategory: (c) => products.filter((p) => p.category === c),
      featured: products.filter((p) => p.featured),
      bestSellers: products.filter((p) => p.bestSeller),
      onSale: products.filter((p) => p.discount > 0),
    };
  }, [products, loading, source]);

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts(): ProductsContextValue {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts debe usarse dentro de <ProductsProvider>");
  return ctx;
}
