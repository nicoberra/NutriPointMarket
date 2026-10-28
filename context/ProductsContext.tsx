"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product, CategorySlug } from "@/lib/types";
import { fetchProducts } from "@/lib/api";
import { applyComboStock, conFotosDeCombos } from "@/lib/stock";
import { productSeed } from "@/data/products-seed";
import { usePathname } from "next/navigation";
import { estaEnCategoria } from "@/lib/categorias";

/**
 * Base instantánea: snapshot real de la tienda. Se ve completa al entrar aunque
 * no haya conexión o la planilla tarde. El fetch en vivo la pisa después.
 */
const SEED = applyComboStock(productSeed);

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
  const [products, setProducts] = useState<Product[]>(SEED);
  const [loading, setLoading] = useState(true);

  // Una sola lectura a la vez: si piden refrescar mientras hay una en curso,
  // se hace UNA más al terminar (así no se apilan llamadas lentas y el
  // resultado final siempre incluye lo último que se guardó).
  const inflight = useRef<Promise<void> | null>(null);
  const again = useRef(false);
  const refresh = useCallback(async () => {
    if (inflight.current) {
      again.current = true;
      return inflight.current;
    }
    const run = async () => {
      do {
        again.current = false;
        const live = applyComboStock(await fetchProducts());
        if (!live.length) continue; // lectura vacía: no borra la base ni el caché
        setProducts(live);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(live));
        } catch {
          /* ignore */
        }
      } while (again.current);
    };
    inflight.current = run().finally(() => {
      inflight.current = null;
    });
    return inflight.current;
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Product[];
        // Solo pisa la base si el caché trae productos (si está vacío, se
        // queda con el snapshot para no mostrar la tienda en blanco).
        if (Array.isArray(parsed) && parsed.length) setProducts(applyComboStock(parsed));
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

  // En la TIENDA, un producto sin foto no se muestra (catálogo, carruseles,
  // menús, búsqueda, ficha). El CRM (/admin) ve todos, para poder arreglarlos.
  const pathname = usePathname();
  const isAdmin = !!pathname && pathname.startsWith("/admin");

  const value = useMemo<ProductsContextValue>(() => {
    // En la tienda, los combos muestran también las fotos de sus productos.
    // Sin precio cargado tampoco se muestra (no se puede comprar a $0).
    const list = isAdmin ? products : conFotosDeCombos(products).filter((p) => !!p.image && p.price > 0);
    const bySlug = new Map(list.map((p) => [p.slug, p]));

    // Marcas derivadas de los productos cargados (para filtros y /marcas).
    const brandMap = new Map<string, string>();
    for (const p of list) {
      const name = p.brand?.trim();
      if (name) brandMap.set(name.toLowerCase(), name);
    }
    const brands: Brand[] = Array.from(brandMap.values())
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ slug: name.toLowerCase(), name }));

    return {
      products: list,
      brands,
      loading,
      refresh,
      getBySlug: (slug) => bySlug.get(slug),
      byCategory: (c) => list.filter((p) => estaEnCategoria(p, c)),
      featured: list.filter((p) => p.featured),
      bestSellers: list.filter((p) => p.bestSeller),
      onSale: list.filter((p) => p.discount > 0),
    };
  }, [products, loading, refresh, isAdmin]);

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts(): ProductsContextValue {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts debe usarse dentro de <ProductsProvider>");
  return ctx;
}
