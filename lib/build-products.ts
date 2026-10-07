import { SHEETS_API_URL } from "./config";
import { slugify } from "./api";
import { productSeedRaw } from "@/data/products-seed";

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
