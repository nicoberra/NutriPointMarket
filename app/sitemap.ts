import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const BASE = "https://suplemarket.com.ar";

/** sitemap.xml con las páginas principales de la tienda. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = ["/", "/productos/", "/marcas/", "/ofertas/", "/contacto/"];
  return routes.map((path) => ({
    url: `${BASE}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
