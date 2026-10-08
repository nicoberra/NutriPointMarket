import type { MetadataRoute } from "next";
import { getBuildProducts } from "@/lib/build-products";

export const dynamic = "force-static";

const BASE = "https://suplemarket.com.ar";

/** sitemap.xml: páginas principales + la página propia de cada producto. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const routes: MetadataRoute.Sitemap = ["/", "/productos/", "/marcas/", "/ofertas/", "/contacto/"].map(
    (path) => ({
      url: `${BASE}${path}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: path === "/" ? 1 : 0.7,
    }),
  );
  const products: MetadataRoute.Sitemap = (await getBuildProducts()).map((p) => ({
      url: `${BASE}/producto/${p.slug}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  return [...routes, ...products];
}
