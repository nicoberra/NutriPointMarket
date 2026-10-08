// Genera versiones WebP livianas de las fotos ANTES del build (corre solo con "prebuild").
//
// - Fotos de producto/categoría (public/productos/*.jpg|jpeg|png) y algunas imágenes fijas
//   (logo, banner) → public/_opt/<ruta>-<ancho>.webp en 400, 800 y 1600 px de ancho.
// - Calidad 90 (visualmente idéntica a la original) y NUNCA se agranda una foto más chica.
// - Los originales no se tocan: la web los usa como respaldo si falta una versión WebP
//   (por ejemplo, una foto recién subida desde el CRM antes de que termine el deploy).
// - Si sharp no está disponible, avisa y sigue: el build nunca falla por esto.
import { readdir, stat, mkdir } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const PUBLIC = path.join(ROOT, "public");
const OUT = path.join(PUBLIC, "_opt");
const WIDTHS = [400, 800, 1600];
const QUALITY = 90;
const EXTRA = ["logo.png", "banner-elegidos.jpg"]; // imágenes fijas que también conviene optimizar
const IS_IMG = /\.(jpe?g|png)$/i;

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.warn("[optimize-images] sharp no disponible: se usan las fotos originales.");
  process.exit(0);
}

async function listImages() {
  const files = [];
  try {
    for (const f of await readdir(path.join(PUBLIC, "productos"))) if (IS_IMG.test(f)) files.push(path.join("productos", f));
  } catch { /* sin carpeta productos */ }
  for (const f of EXTRA) {
    try { await stat(path.join(PUBLIC, f)); files.push(f); } catch { /* no existe */ }
  }
  return files;
}

async function isFresh(src, dest) {
  try {
    const [s, d] = await Promise.all([stat(src), stat(dest)]);
    return d.mtimeMs >= s.mtimeMs;
  } catch { return false; }
}

const files = await listImages();
let made = 0, skipped = 0, failed = 0;
const t0 = Date.now();
for (const rel of files) {
  const src = path.join(PUBLIC, rel);
  const base = rel.replace(IS_IMG, "");
  try {
    const meta = await sharp(src).metadata();
    for (const w of WIDTHS) {
      const dest = path.join(OUT, `${base}-${w}.webp`);
      if (await isFresh(src, dest)) { skipped++; continue; }
      await mkdir(path.dirname(dest), { recursive: true });
      await sharp(src)
        .rotate() // respeta la orientación EXIF de fotos de celular
        .resize({ width: Math.min(w, meta.width || w), withoutEnlargement: true })
        .webp({ quality: QUALITY, alphaQuality: 100, smartSubsample: true, effort: 5 })
        .toFile(dest);
      made++;
    }
  } catch (e) {
    failed++;
    console.warn(`[optimize-images] no se pudo procesar ${rel}: ${e.message}`);
  }
}
console.log(`[optimize-images] ${files.length} imágenes · ${made} generadas · ${skipped} ya estaban · ${failed} con error · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
