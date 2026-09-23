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

/** Categorías por defecto (fallback si la planilla no responde). */
export const categories: Category[] = [
  { slug: "proteinas", name: "Proteínas", tagline: "Whey, veganas y caseínas", shape: "tub" },
  { slug: "creatinas", name: "Creatinas", tagline: "Monohidrato y micronizada", shape: "jar" },
  { slug: "pre-entreno", name: "Pre entreno", tagline: "Energía y foco", shape: "bottle" },
  { slug: "aminoacidos", name: "Aminoácidos", tagline: "BCAA, EAA y glutamina", shape: "jar" },
  { slug: "vitaminas", name: "Vitaminas", tagline: "Defensas y bienestar", shape: "pills" },
  { slug: "minerales", name: "Minerales", tagline: "Magnesio, zinc y más", shape: "pills" },
  { slug: "colageno", name: "Colágeno", tagline: "Piel, huesos y articulaciones", shape: "bottle" },
  { slug: "barras-snacks", name: "Barras y snacks", tagline: "Proteína para llevar", shape: "bar" },
  { slug: "combos", name: "Combos", tagline: "Comprá más, pagá menos", shape: "combo" },
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
