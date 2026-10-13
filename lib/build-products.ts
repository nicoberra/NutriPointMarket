import { SHEETS_API_URL } from "./config";
import { slugify } from "./api";
import { productSeedRaw } from "@/data/products-seed";
import { categories as defaultCategories } from "@/data/categories";

/**
 * Lista de productos para el BUILD (páginas estáticas /producto/<slug>/ y
 * sitemap): combina el snapshot del repo con la planilla en vivo, así cada
 * deploy (incluido el que dispara subir una foto) genera la página de todos
 * los productos actuales. Si la planilla no responde, queda el snapshot.
 */
export type BuildProduct = {
  slug: string;
  name: string;
  brand: string;
  image: string;
  description: string;
  /** slug y nombre de la categoría (como en la planilla) */
  category: string;
  categoryName: string;
};

const BASE = "https://suplemarket.com.ar";

export function absoluteImage(image: string): string | undefined {
  if (!image) return undefined;
  return image.startsWith("http") ? image : `${BASE}${image}`;
}

export async function getBuildProducts(): Promise<BuildProduct[]> {
  const map = new Map<string, BuildProduct>();
  const add = (r: Record<string, unknown>) => {
    const name = String(r.nombre ?? "").trim();
    if (!name) return;
    const slug = slugify(name);
    if (!slug || map.has(slug)) return;
    map.set(slug, {
      slug,
      name,
      brand: String(r.marca ?? "").trim(),
      image: String(r.imagen ?? "").split("|")[0].trim(),
      description: String(r.descripcion ?? "").trim(),
      category: slugify(String(r.categoria ?? "").trim()) || "proteinas",
      categoryName: String(r.categoria ?? "").trim() || "Proteínas",
    });
  };
  for (const r of productSeedRaw) add(r);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(`${SHEETS_API_URL}?action=productos_list`, { signal: ctrl.signal });
    clearTimeout(t);
    const j = (await res.json()) as { data?: Record<string, unknown>[] };
    if (Array.isArray(j?.data)) for (const r of j.data) add(r);
  } catch {
    /* sin red en el build: queda el snapshot */
  }
  return Array.from(map.values());
}

/** Categorías para el BUILD (páginas /categoria/<slug>/ y sitemap): las del
 * snapshot + las que tengan productos. */
export async function getBuildCategories(): Promise<{ slug: string; name: string }[]> {
  const map = new Map<string, string>();
  for (const c of defaultCategories) map.set(c.slug, c.name);
  for (const p of await getBuildProducts()) if (p.category && !map.has(p.category)) map.set(p.category, p.categoryName);
  return Array.from(map, ([slug, name]) => ({ slug, name }));
}
