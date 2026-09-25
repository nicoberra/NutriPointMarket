import type { MetadataRoute } from "next";

export const dynamic = "force-static";

/** robots.txt — permite indexar todo menos el panel /admin. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/admin",
    },
    sitemap: "https://suplemarket.com.ar/sitemap.xml",
    host: "https://suplemarket.com.ar",
  };
}
