import type { Brand } from "@/lib/types";

/**
 * Marcas de demostración. Los "logos" se representan por ahora como cajas
 * tipográficas (ver componente BrandCard). Cuando existan logos reales,
 * reemplazar `label` o extender el tipo con una ruta de imagen.
 */
export const brands: Brand[] = [
  { slug: "star-nutrition", name: "Star Nutrition", label: "STAR" },
  { slug: "ena", name: "ENA Sport", label: "ENA" },
  { slug: "gold-nutrition", name: "Gold Nutrition", label: "GOLD" },
  { slug: "universal", name: "Universal", label: "UNIV" },
  { slug: "bsn", name: "BSN", label: "BSN" },
  { slug: "one-fit", name: "One Fit", label: "ONE" },
  { slug: "mervick", name: "Mervick", label: "MRVK" },
  { slug: "xbody", name: "XBody", label: "XBODY" },
];

export const brandMap: Record<string, Brand> = Object.fromEntries(
  brands.map((b) => [b.slug, b]),
);

export function getBrand(slug: string): Brand | undefined {
  return brandMap[slug];
}

export function brandName(slug: string): string {
  return brandMap[slug]?.name ?? slug;
}
