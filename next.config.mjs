/** @type {import('next').NextConfig} */

// Con dominio propio (nutripointmarket.com.ar vía Cloudflare) el sitio se sirve
// en la raíz "/", así que NO usamos basePath. Si algún día volvés a publicar en
// https://<usuario>.github.io/<REPO>/ sin dominio, poné REPO = "NutriPointMarket".
const REPO = "";
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  reactStrictMode: true,

  // Exporta el sitio como HTML/CSS/JS estático (carpeta "out/") para GitHub Pages.
  output: "export",

  // En producción, servir bajo /NutriPointMarket. En desarrollo (npm run dev) queda en la raíz.
  basePath: isProd && REPO ? `/${REPO}` : "",
  assetPrefix: isProd && REPO ? `/${REPO}/` : "",

  // GitHub Pages sirve mejor con URLs terminadas en "/".
  trailingSlash: true,

  // Sin optimizador de imágenes (no hay servidor Node en GitHub Pages).
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
