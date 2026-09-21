/** @type {import('next').NextConfig} */

// Nombre del repositorio de GitHub. Como GitHub Pages publica el sitio en
// https://<usuario>.github.io/<REPO>/ , necesitamos un "basePath" con ese nombre.
// 👉 Si algún día usás un dominio propio (ej: nutripointmarket.com), poné REPO = "".
const REPO = "NutriPointMarket";
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
