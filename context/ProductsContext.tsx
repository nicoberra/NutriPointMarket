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
import { fetchProducts } from "@/lib/api";

/**
 * Provee TODOS los productos, que se cargan desde la planilla de Google Sheets.
 * Agregás una fila en el Sheets (o en el CRM) → aparece en la web. No hay
 * productos en el código. Pinta desde cache y refresca en segundo plano.
 */

interface Brand {
  slug: string;
  name: string;
}

interface ProductsContextValue {
  products: Product[];
  brands: Brand[];
  loading: boolean;
  refresh: () => Promise<void>;
  getBySlug: (slug: string) => Product | undefined;
  byCategory: (c: CategorySlug) => Product[];
  featured: Product[];
  bestSellers: Product[];
  onSale: Product[];
}

const ProductsContext = createContext<ProductsContextValue | null>(null);
const CACHE_KEY = "npm-products-cache-v3";

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const live = await fetchProducts();
    setProducts(live);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(live));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Product[];
        if (Array.isArray(parsed)) setProducts(parsed);
      }
    } catch {
      /* ignore */
    }
    refresh()
      .catch(() => {
        /* se queda con cache o vacío */
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  const value = useMemo<ProductsContextValue>(() => {
    const bySlug = new Map(products.map((p) => [p.slug, p]));

    // Marcas derivadas de los productos cargados (para filtros y /marcas).
    const brandMap = new Map<string, string>();
    for (const p of products) {
      const name = p.brand?.trim();
      if (name) brandMap.set(name.toLowerCase(), name);
    }
    const brands: Brand[] = Array.from(brandMap.values())
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ slug: name.toLowerCase(), name }));

    return {
      products,
      brands,
      loading,
      refresh,
      getBySlug: (slug) => bySlug.get(slug),
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
