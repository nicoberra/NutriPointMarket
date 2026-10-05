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
import type { Category } from "@/lib/types";
import {
  categories as defaultCategories,
  categoryFromName,
  registerCategories,
} from "@/data/categories";
import { fetchCategories, localAsset } from "@/lib/api";

/**
 * Categorías cargadas desde la planilla (pestaña Categorias), editables desde
 * el CRM. Pinta primero desde caché/def. y refresca contra el backend.
 */

interface CategoriesContextValue {
  categories: Category[];
  refresh: () => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);
const CACHE_KEY = "npm-categories-cache-v2";

function sync(list: Category[]) {
  registerCategories(list);
}

export function CategoriesProvider({ children }: { children: ReactNode }) {
  // Arranca SIEMPRE con las por defecto (mismo HTML en server y cliente → sin
  // hydration mismatch). El caché y la planilla se cargan después de montar.
  const [categories, setCategories] = useState<Category[]>(defaultCategories);

  const refresh = useCallback(async () => {
    try {
      const rows = await fetchCategories();
      if (!rows.length) return;
      const list = rows.map((r) => {
        const cat = categoryFromName(String(r.nombre));
        const img = localAsset(r.imagen);
        return img ? { ...cat, image: img } : cat;
      });
      sync(list);
      setCategories(list);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(list));
      } catch {
        /* ignore */
      }
    } catch {
      /* mantiene lo que haya */
    }
  }, []);

  useEffect(() => {
    // Pinta desde caché (ya hidratado, no rompe el SSR) y luego refresca.
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as Category[];
        if (Array.isArray(cached) && cached.length) {
          // Normaliza URLs viejas (raw.githubusercontent → ruta local).
          const fixed = cached.map((c) =>
            c.image ? { ...c, image: localAsset(c.image) } : c,
          );
          sync(fixed);
          setCategories(fixed);
        }
      }
    } catch {
      /* ignore */
    }
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ categories, refresh }), [categories, refresh]);

  return (
    <CategoriesContext.Provider value={value}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories(): CategoriesContextValue {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error("useCategories debe usarse dentro de <CategoriesProvider>");
  return ctx;
}
