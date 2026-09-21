import type { Category, CategorySlug } from "@/lib/types";

export const categories: Category[] = [
  {
    slug: "proteinas",
    name: "Proteínas",
    tagline: "Whey, veganas y caseínas",
    shape: "tub",
  },
  {
    slug: "creatinas",
    name: "Creatinas",
    tagline: "Monohidrato y micronizada",
    shape: "jar",
  },
  {
    slug: "pre-entreno",
    name: "Pre entreno",
    tagline: "Energía y foco",
    shape: "bottle",
  },
  {
    slug: "aminoacidos",
    name: "Aminoácidos",
    tagline: "BCAA, EAA y glutamina",
    shape: "jar",
  },
  {
    slug: "vitaminas",
    name: "Vitaminas",
    tagline: "Defensas y bienestar",
    shape: "pills",
  },
  {
    slug: "minerales",
    name: "Minerales",
    tagline: "Magnesio, zinc y más",
    shape: "pills",
  },
  {
    slug: "colageno",
    name: "Colágeno",
    tagline: "Piel, huesos y articulaciones",
    shape: "bottle",
  },
  {
    slug: "barras-snacks",
    name: "Barras y snacks",
    tagline: "Proteína para llevar",
    shape: "bar",
  },
  {
    slug: "combos",
    name: "Combos",
    tagline: "Comprá más, pagá menos",
    shape: "combo",
  },
];

export const categoryMap: Record<CategorySlug, Category> = Object.fromEntries(
  categories.map((c) => [c.slug, c]),
) as Record<CategorySlug, Category>;

export function categoryName(slug: CategorySlug): string {
  return categoryMap[slug]?.name ?? slug;
}
