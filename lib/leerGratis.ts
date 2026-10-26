import type { AnalisisCompra, ItemLeido } from "@/lib/compras";

/**
 * Lectura gratis (sin IA) de compras: PDFs con texto (como los pedidos de El
 * Nogal), Excel/CSV y compras escritas a mano con un formato simple. Solo se
 * aceptan renglones donde cantidad × precio da el total (o que tengan cantidad y
 * precio claros); si no se encuentra nada, el CRM usa la IA.
 */

type Pieza = { x: number; y: number; t: string };

const RE_MONTO = /^\$?\s*\d{1,3}(?:\.\d{3})*,\d{2}$/; // "$ 15.121,80"
const RE_CANT = /^\d{1,5}$/;

/** "15.121,80" / "15121.8" / "$ 1.234" → número. */
export function aNumero(v: string): number {
  const s = String(v ?? "").replace(/[$\s]/g, "");
  if (!s) return NaN;
  const ar = /,\d{1,2}$/.test(s) || /^\d{1,3}(\.\d{3})+$/.test(s);
  const n = Number(ar ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

const cuadra = (q: number, u: number, t: number) => Math.abs(q * u - t) <= Math.max(1, t * 0.01);

/** "ENA CREATINA MICRONIZADA 150GR" → marca "ENA", producto "Creatina Micronizada 150gr". */
function separarMarca(nombre: string, marcas: string[]): { marca: string; producto: string } {
  const limpio = nombre.replace(/\s+/g, " ").trim();
  const sinAcento = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const n = sinAcento(limpio);
  const lista = [...marcas].filter(Boolean).sort((a, b) => b.length - a.length);
  // Al principio ("ENA CREATINA…") o en cualquier lugar ("whey Star vainilla": "Star" = Star Nutrition).
  const marca = lista.find((m) => n === sinAcento(m) || n.startsWith(sinAcento(m) + " "));
  if (marca) {
    const resto = limpio.slice(marca.length).trim();
    return { marca, producto: esMayusculas(resto) ? titulo(resto) : resto };
  }
  for (const m of lista) {
    for (const alias of [m, m.split(" ")[0]]) {
      if (alias.length < 3) continue;
      const re = new RegExp(`(^|\\s)${sinAcento(alias).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`);
      const hit = re.exec(n);
      if (!hit) continue;
      const ini = hit.index + hit[1].length;
      const resto = (limpio.slice(0, ini) + limpio.slice(ini + alias.length)).replace(/\s+/g, " ").trim();
      return { marca: m, producto: esMayusculas(resto) ? titulo(resto) : resto };
    }
  }
  return { marca: "", producto: esMayusculas(limpio) ? titulo(limpio) : limpio };
}
const esMayusculas = (t: string) => t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t);
const titulo = (t: string) =>
  t
    .split(" ")
    .map((w) => (/\d/.test(w) ? w.toLowerCase() : w.charAt(0) + w.slice(1).toLowerCase()))
    .join(" ");

function item(nombre: string, q: number, u: number, marcas: string[]): ItemLeido {
  const { marca, producto } = separarMarca(nombre, marcas);
  return { marca, producto, variante: "", cantidad: q, precioUnitario: Math.round(u * 100) / 100, catalogo: "" };
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Fecha, total y proveedor que se puedan reconocer en el texto completo. */
function datosGenerales(texto: string): Pick<AnalisisCompra, "fecha" | "total" | "proveedor"> {
  const p2 = (n: number) => String(n).padStart(2, "0");
  let fecha = "";
  const m1 = texto.match(/\b(\d{1,2})\s+(?:de\s+)?([a-záéíóú]+)\s+(?:de\s+)?(\d{4})\b/i);
  const mes = m1 ? MESES.indexOf(m1[2].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")) : -1;
  if (m1 && mes >= 0) fecha = `${m1[3]}-${p2(mes + 1)}-${p2(Number(m1[1]))}`;
  else {
    const m2 = texto.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (m2) fecha = `${m2[3]}-${p2(Number(m2[2]))}-${p2(Number(m2[1]))}`;
  }
  const tot = Array.from(texto.matchAll(/\bTOTAL\b[^\d$]{0,20}\$?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/gi)).pop();
  return { fecha, total: tot ? aNumero(tot[1]) : 0, proveedor: /nogal/i.test(texto) ? "El Nogal" : "" };
}

/* ------------------------------- PDF con texto ---------------------------- */

async function piezasDePdf(buf: ArrayBuffer): Promise<Pieza[][]> {
  const pdfjs = await import("pdfjs-dist");
  // Sin worker aparte: el lector corre en la página (los PDFs de compras son chicos).
  const g = globalThis as { pdfjsWorker?: unknown };
  if (!g.pdfjsWorker) g.pdfjsWorker = await import("pdfjs-dist/build/pdf.worker.min.mjs");
  const tarea = pdfjs.getDocument({ data: new Uint8Array(buf) });
  const doc = await tarea.promise;
  const paginas: Pieza[][] = [];
  for (let i = 1; i <= Math.min(doc.numPages, 20); i++) {
    const tc = await (await doc.getPage(i)).getTextContent();
    const piezas: Pieza[] = [];
    for (const it of tc.items) {
      if (!("str" in it) || !it.str.trim()) continue;
      piezas.push({ x: it.transform[4], y: it.transform[5], t: it.str.trim() });
    }
    paginas.push(unirSignoPeso(piezas));
  }
  await tarea.destroy();
  return paginas;
}

// "$" suelto + "15.121,80" en la misma línea → una sola pieza.
function unirSignoPeso(piezas: Pieza[]): Pieza[] {
  const orden = [...piezas].sort((a, b) => b.y - a.y || a.x - b.x);
  const out: Pieza[] = [];
  for (let i = 0; i < orden.length; i++) {
    const p = orden[i], s = orden[i + 1];
    if (p.t === "$" && s && Math.abs(s.y - p.y) < 3 && RE_MONTO.test(s.t)) { out.push({ ...s, t: s.t }); i++; continue; }
    out.push({ ...p, t: p.t.replace(/^\$\s*/, "") });
  }
  // Una pieza con varios valores ("3 $ 19.400,01 $ 58.200,03") se separa por palabras.
  return out.flatMap((p) => {
    const partes = p.t.split(/\s+(?=\$?\s*\d)|(?<=\d)\s+(?=\$)/).map((x) => x.replace(/^\$\s*/, "").trim()).filter(Boolean);
    if (partes.length < 2 || !partes.some((x) => RE_MONTO.test(x))) return [p];
    const ancho = 5;
    return partes.map((t, k) => ({ x: p.x + k * ancho, y: p.y, t }));
  });
}

function leerPagina(piezas: Pieza[], marcas: string[]): ItemLeido[] {
  // Anclas: líneas con dos montos (precio unitario y total).
  const lineas: Pieza[][] = [];
  for (const p of [...piezas].sort((a, b) => b.y - a.y)) {
    const l = lineas.find((x) => Math.abs(x[0].y - p.y) < 3);
    if (l) l.push(p); else lineas.push([p]);
  }
  const anclas = lineas
    .map((l) => l.filter((p) => RE_MONTO.test(p.t)).sort((a, b) => a.x - b.x))
    .filter((m) => m.length >= 2)
    .map((m) => ({ y: m[0].y, unit: m[m.length - 2], total: m[m.length - 1] }));
  if (!anclas.length) return [];
  const ys = anclas.map((a) => a.y).sort((a, b) => b - a);
  const gaps = ys.slice(1).map((y, i) => ys[i] - y).sort((a, b) => a - b);
  const radio = Math.max(6, (gaps.length ? gaps[Math.floor(gaps.length / 2)] : 24) * 0.55);
  const filas = anclas.map((a) => ({ ...a, piezas: [] as Pieza[] }));
  for (const p of piezas) {
    if (filas.some((f) => f.unit === p || f.total === p)) continue;
    let mejor = null as (typeof filas)[number] | null, dist = Infinity;
    for (const f of filas) { const d = Math.abs(f.y - p.y); if (d < dist) { dist = d; mejor = f; } }
    if (mejor && dist <= radio && p.x < mejor.unit.x) mejor.piezas.push(p);
  }
  const items: ItemLeido[] = [];
  for (const f of filas) {
    const u = aNumero(f.unit.t), t = aNumero(f.total.t);
    const cands = f.piezas.filter((p) => RE_CANT.test(p.t)).sort((a, b) => b.x - a.x);
    const cant = cands.find((p) => cuadra(Number(p.t), u, t));
    const q = cant ? Number(cant.t) : Math.round(t / u);
    if (!(q > 0) || !cuadra(q, u, t)) continue;
    const nombre = f.piezas
      .filter((p) => p !== cant && (!cant || p.x < cant.x - 1))
      .sort((a, b) => b.y - a.y || a.x - b.x)
      .map((p) => p.t)
      .join(" ");
    if (/^(sub)?total\b|^iva\b|^descuento/i.test(nombre.trim()) || !/[a-z]/i.test(nombre)) continue;
    items.push(item(nombre, q, u, marcas));
  }
  return items;
}

/* ------------------------- Planillas y texto escrito ----------------------- */

/** Renglones "Producto | 3 | 15121,80 | 45365,40" (Excel/CSV ya pasados a texto). */
function leerRenglones(texto: string, marcas: string[]): ItemLeido[] {
  const items: ItemLeido[] = [];
  for (const linea of texto.split(/\r?\n/)) {
    // Excel llega con " | "; un CSV puede venir con ";", tabs o comas.
    const sep = /[|;\t]/.test(linea) ? /\s*[|;\t]\s*/ : /\s*,\s*/;
    const celdas = linea.split(sep).map((c) => c.trim()).filter(Boolean);
    if (celdas.length < 2) continue;
    const nombre = celdas.filter((c) => Number.isNaN(aNumero(c))).join(" ");
    const nums = celdas.map(aNumero).filter((n) => !Number.isNaN(n));
    if (!nombre || nums.length < 2 || /^(sub)?total\b|^iva\b/i.test(nombre)) continue;
    let q = 0, u = 0;
    if (nums.length >= 3 && cuadra(nums[0], nums[1], nums[2])) { q = nums[0]; u = nums[1]; }
    else if (nums.length >= 3 && cuadra(nums[1], nums[0], nums[2])) { q = nums[1]; u = nums[0]; }
    else if (nums.length === 2) {
      const [a, b] = nums;
      if (Number.isInteger(a) && a <= 999 && b > a) { q = a; u = b; } else if (Number.isInteger(b) && b <= 999 && a > b) { q = b; u = a; }
    }
    if (q > 0 && Number.isInteger(q) && u > 0) items.push(item(nombre, q, u, marcas));
  }
  return items;
}

/**
 * Compra escrita: "El Nogal, 3 creatinas ENA 300 g a 15.121,80, 2 whey Star vainilla a $28.500".
 * Solo si TODOS los renglones se entienden (si no, mejor que la lea la IA).
 */
export function leerTextoEscrito(texto: string, marcas: string[]): AnalisisCompra | null {
  const partes = texto.split(/\n|;|,\s+(?=\d)|\s+y\s+(?=\d)/).map((s) => s.trim().replace(/[.,]$/, "")).filter(Boolean);
  const items: ItemLeido[] = [];
  let proveedor = "", pago = "";
  for (const p of partes) {
    const m = p.match(/^(\d{1,4})\s*(?:x\s+|u\.?\s+|unid(?:ades)?\.?\s+)?(.+?)\s+(?:a|x|por|@)\s*\$?\s*([\d.,]+)\s*(?:c\/u|cada una?|c\/\s*u|cu)?$/i);
    if (m) { items.push(item(m[2], Number(m[1]), aNumero(m[3]), marcas)); continue; }
    if (/pagu[eé]|pago/i.test(p)) { pago = p; continue; }
    if (!/\d/.test(p) && !proveedor && !items.length) { proveedor = p.replace(/^(compra\s+(a|en)\s+)/i, ""); continue; }
    return null;
  }
  if (!items.length || items.some((i) => !(i.precioUnitario > 0))) return null;
  return { proveedor, fecha: "", total: 0, items, notas: pago, dudas: "" };
}

/** Intenta leer el archivo sin IA. Devuelve null si no encontró productos. */
export async function leerArchivoGratis(file: File, texto: string | undefined, marcas: string[]): Promise<AnalisisCompra | null> {
  const ext = (file.name.toLowerCase().split(".").pop() || "").trim();
  let items: ItemLeido[] = [];
  let todo = texto ?? "";
  if (ext === "pdf" || file.type === "application/pdf") {
    const paginas = await piezasDePdf(await file.arrayBuffer());
    items = paginas.flatMap((p) => leerPagina(p, marcas));
    todo = paginas.map((p) => [...p].sort((a, b) => b.y - a.y || a.x - b.x).map((x) => x.t).join(" ")).join("\n");
  } else if (texto) {
    items = leerRenglones(texto, marcas);
  }
  if (!items.length) return null;
  return { ...datosGenerales(todo), items, notas: "", dudas: "" };
}
