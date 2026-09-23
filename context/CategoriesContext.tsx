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
import { fetchCategories } from "@/lib/api";

/**
 * Categorías cargadas desde la planilla (pestaña Categorias), editables desde
 * el CRM. Pinta primero desde caché/def. y refresca contra el backend.
 */

interface CategoriesContextValue {
  categories: Category[];
  refresh: () => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);
const CACHE_KEY = "npm-categories-cache-v1";

function sync(list: Category[]) {
  registerCategories(list);
}

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const cached = JSON.parse(raw) as Category[];
          if (Array.isArray(cached) && cached.length) {
            sync(cached);
            return cached;
          }
        }
      } catch {
        /* ignore */
      }
    }
    sync(defaultCategories);
    return defaultCategories;
  });

  const refresh = useCallback(async () => {
    try {
      const rows = await fetchCategories();
      if (!rows.length) return;
      const list = rows.map((r) => categoryFromName(String(r.nombre)));
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
