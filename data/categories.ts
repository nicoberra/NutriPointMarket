import type { Category, CategorySlug, ProductShape } from "@/lib/types";

/** slug local (sin depender de lib/api para evitar import circular). */
function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SHAPES: ProductShape[] = ["tub", "jar", "bottle", "pills", "bar", "combo"];
const KNOWN_SHAPES: Record<string, ProductShape> = {
  proteinas: "tub",
  creatinas: "jar",
  "pre-entreno": "bottle",
  aminoacidos: "jar",
  vitaminas: "pills",
  minerales: "pills",
  colageno: "bottle",
  "barras-snacks": "bar",
  combos: "combo",
};

/** Forma del visual para una categoría (conocida o nueva, por hash del slug). */
export function shapeForSlug(s: string): ProductShape {
  if (KNOWN_SHAPES[s]) return KNOWN_SHAPES[s];
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return SHAPES[h % SHAPES.length];
}

/** Convierte un slug en un nombre legible (fallback si no está en el mapa). */
export function deslugify(s: string): string {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Construye una Category a partir del nombre (como viene de la planilla). */
export function categoryFromName(nombre: string): Category {
  const s = slug(nombre);
  return { slug: s, name: nombre.trim(), tagline: "", shape: shapeForSlug(s) };
}

/**
 * Categorías por defecto (fallback si la planilla no responde). Es un snapshot
 * de las categorías REALES de la tienda, con las imágenes servidas desde el
 * propio dominio, para que al entrar se vean las correctas al instante. La
 * planilla (CRM) sigue siendo la fuente: cualquier cambio que hagas ahí pisa
 * esto al refrescar. Si agregás/sacás categorías en el CRM y querés que el
 * respaldo instantáneo también lo refleje, actualizá esta lista.
 */
export const categories: Category[] = [
  { slug: "proteinas", name: "Proteínas", tagline: "", shape: "tub", image: "/productos/protei-nas-1791159337812.jpg" },
  { slug: "creatina", name: "Creatina", tagline: "", shape: "jar", image: "/productos/creatina-1791159328845.jpg" },
  { slug: "pancakes-proteicos", name: "Pancakes PROTEICOS", tagline: "", shape: "bar", image: "/productos/pancakes-proteicos-1791161879816.jpg" },
  { slug: "kinesio-tape", name: "Kinesio TAPE", tagline: "", shape: "bar", image: "/productos/kinesio-tape-1791159318671.jpg" },
  { slug: "shakers", name: "Shakers", tagline: "", shape: "bottle", image: "/productos/shakers-1791150078717.jpg" },
  { slug: "combos", name: "Combos", tagline: "", shape: "combo", image: "/productos/combos-1791149845090.jpg" },
];

/**
 * Mapa slug → Category. Arranca con las defaults y la CategoriesContext lo
 * completa con las categorías reales de la planilla (para que el nombre se
 * muestre bien en toda la tienda).
 */
export const categoryMap: Record<CategorySlug, Category> = Object.fromEntries(
  categories.map((c) => [c.slug, c]),
);

/** La CategoriesContext llama esto al cargar las categorías de la planilla. */
export function registerCategories(list: Category[]): void {
  for (const c of list) categoryMap[c.slug] = c;
}

export function categoryName(slugStr: CategorySlug): string {
  return categoryMap[slugStr]?.name ?? deslugify(slugStr);
}
