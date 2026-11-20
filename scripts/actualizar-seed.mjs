// Actualiza el snapshot de productos (data/products-seed.ts) desde la planilla
// ANTES de cada build (corre con "prebuild").
//
// Por qué: la web arranca mostrando ese snapshot hasta que llegan los datos en
// vivo, y el HTML que lee Google sale de ahí. Si quedaba de hace semanas,
// faltaban productos y había stock viejo. Así queda al día en cada publicación.
//
// - Usa la lista PÚBLICA (sin costos ni datos internos).
// - Las fotos del repo pasan a rutas locales (/productos/...) si el archivo existe.
// - Si la planilla no responde o la respuesta es rara, deja el snapshot como
//   estaba y sigue: el build nunca falla por esto.
import { readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const SEED = path.join(ROOT, "data", "products-seed.ts");
const RAW = "https://raw.githubusercontent.com/nicoberra/NutriPointMarket/main/public";
const MIN_PRODUCTOS = 5;

async function existe(rel) {
  try {
    await access(path.join(ROOT, "public", rel));
    return true;
  } catch {
    return false;
  }
}

// Reemplaza las URLs del repo por rutas locales cuando la foto ya está en public/.
async function localizar(texto) {
  const urls = [...new Set(String(texto).match(/https:\/\/raw\.githubusercontent\.com\/nicoberra\/NutriPointMarket\/main\/public\/[^|"\s,]+/g) || [])];
  let out = String(texto);
  for (const u of urls) {
    const rel = u.slice(RAW.length);
    if (await existe(rel)) out = out.split(u).join(rel);
  }
  return out;
}

async function main() {
  const config = await readFile(path.join(ROOT, "lib", "config.ts"), "utf8");
  const api = (config.match(/SHEETS_API_URL\s*=\s*"([^"]+)"/) || [])[1];
  if (!api) throw new Error("no encontré SHEETS_API_URL en lib/config.ts");

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  const res = await fetch(`${api}?action=productos_list&t=${Date.now()}`, { signal: ctrl.signal, redirect: "follow" });
  clearTimeout(t);
  const j = await res.json();
  const data = Array.isArray(j?.data) ? j.data : [];
  if (data.length < MIN_PRODUCTOS || !data.every((p) => p && String(p.nombre || "").trim())) {
    throw new Error(`respuesta rara de la planilla (${data.length} productos)`);
  }

  const limpios = [];
  for (const p of data) {
    const r = { ...p };
    delete r.costo;
    delete r.costoMoneda;
    if (r.imagen) r.imagen = await localizar(r.imagen);
    if (r.variantesFotos) r.variantesFotos = await localizar(r.variantesFotos);
    limpios.push(r);
  }

  const actual = await readFile(SEED, "utf8");
  const ini = actual.indexOf("export const productSeedRaw");
  const fin = actual.indexOf("\n];", ini);
  if (ini < 0 || fin < 0) throw new Error("no encontré productSeedRaw en data/products-seed.ts");
  const eol = actual.includes("\r\n") ? "\r\n" : "\n";
  const cuerpo = JSON.stringify(limpios, null, 2).replace(/\n/g, eol);
  const nuevo = actual.slice(0, ini) + "export const productSeedRaw: Record<string, unknown>[] = " + cuerpo + ";" + actual.slice(fin + 3);
  if (nuevo === actual) {
    console.log(`[seed] sin cambios (${limpios.length} productos)`);
    return;
  }
  await writeFile(SEED, nuevo);
  console.log(`[seed] actualizado desde la planilla: ${limpios.length} productos`);
}

main().catch((e) => {
  console.warn(`[seed] no se actualizó (queda el anterior): ${e.message}`);
});
