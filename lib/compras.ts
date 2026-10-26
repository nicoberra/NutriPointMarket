import { api, getCrmToken, resizeImageToBase64 } from "@/lib/api";
import { SHEETS_API_URL } from "@/lib/config";
import { leerArchivoGratis, leerTextoEscrito } from "@/lib/leerGratis";

/**
 * Lectura de compras con IA: el CRM manda una foto, un archivo o un texto al
 * backend, que guarda el archivo en Drive y lo lee con Claude. Como la subida
 * va por POST no-cors (no se ve la respuesta), el resultado se consulta después
 * con el id de trabajo.
 */

export type ArchivoCompra = { id: string; nombre: string; tipo: string; url: string };
export type ItemLeido = { marca: string; producto: string; variante: string; cantidad: number; precioUnitario: number; catalogo: string };
export type AnalisisCompra = { proveedor: string; fecha: string; total: number; items: ItemLeido[]; notas: string; dudas: string };
export type ResultadoCompra = { ok: boolean; archivo?: ArchivoCompra; analisis?: AnalisisCompra; errorLectura?: string; error?: string };

export const ACEPTA_ARCHIVOS = "image/*,.pdf,.xlsx,.csv,.txt,.docx";
const MAX_BYTES = 15 * 1024 * 1024;

/* ------------------------ Texto de Excel y Word --------------------------- */

// .xlsx y .docx son ZIPs con XML adentro: se leen con DecompressionStream (sin librerías).
async function leerZip(buf: ArrayBuffer): Promise<Map<string, () => Promise<string>>> {
  const v = new DataView(buf);
  let fin = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 70000); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { fin = i; break; }
  }
  if (fin < 0) throw new Error("El archivo está dañado o no es un Excel/Word válido.");
  const total = v.getUint16(fin + 10, true);
  let pos = v.getUint32(fin + 16, true);
  const archivos = new Map<string, () => Promise<string>>();
  for (let n = 0; n < total; n++) {
    if (v.getUint32(pos, true) !== 0x02014b50) break;
    const metodo = v.getUint16(pos + 10, true);
    const tam = v.getUint32(pos + 20, true);
    const largoNombre = v.getUint16(pos + 28, true);
    const largoExtra = v.getUint16(pos + 30, true);
    const largoComent = v.getUint16(pos + 32, true);
    const local = v.getUint32(pos + 42, true);
    const nombre = new TextDecoder().decode(new Uint8Array(buf, pos + 46, largoNombre));
    archivos.set(nombre, async () => {
      const ini = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
      const datos = new Uint8Array(buf, ini, tam);
      if (metodo === 0) return new TextDecoder().decode(datos);
      const flujo = new Blob([datos]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return new Response(flujo).text();
    });
    pos += 46 + largoNombre + largoExtra + largoComent;
  }
  return archivos;
}

const xml = (t: string) => new DOMParser().parseFromString(t, "application/xml");
const columna = (ref: string) => Array.from(ref.replace(/\d/g, "")).reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0) - 1;

async function textoDeExcel(buf: ArrayBuffer): Promise<string> {
  const zip = await leerZip(buf);
  const compartidos = zip.get("xl/sharedStrings.xml");
  const textos = compartidos
    ? Array.from(xml(await compartidos()).getElementsByTagName("si")).map((si) =>
        Array.from(si.getElementsByTagName("t")).map((t) => t.textContent ?? "").join(""))
    : [];
  const hojas = Array.from(zip.keys())
    .filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
  const salida: string[] = [];
  for (let h = 0; h < hojas.length; h++) {
    const filas = Array.from(xml(await zip.get(hojas[h])!()).getElementsByTagName("row")).slice(0, 3000);
    if (hojas.length > 1) salida.push(`--- Hoja ${h + 1} ---`);
    for (const fila of filas) {
      const celdas: string[] = [];
      for (const c of Array.from(fila.getElementsByTagName("c"))) {
        const tipo = c.getAttribute("t");
        const val = c.getElementsByTagName("v")[0]?.textContent ?? "";
        const txt = tipo === "s" ? textos[Number(val)] ?? "" : tipo === "inlineStr" ? c.getElementsByTagName("t")[0]?.textContent ?? "" : val;
        celdas[columna(c.getAttribute("r") || "A1")] = txt.trim();
      }
      const linea = Array.from(celdas, (x) => x ?? "").join(" | ").replace(/(\s\|\s)+$/, "");
      if (linea.replace(/[\s|]/g, "")) salida.push(linea);
    }
  }
  return salida.join("\n");
}

async function textoDeWord(buf: ArrayBuffer): Promise<string> {
  const zip = await leerZip(buf);
  const doc = zip.get("word/document.xml");
  if (!doc) throw new Error("No se encontró el texto del Word.");
  const d = xml(await doc());
  return Array.from(d.getElementsByTagName("w:p"))
    .map((p) => Array.from(p.getElementsByTagName("w:t")).map((t) => t.textContent ?? "").join(""))
    .filter((l) => l.trim())
    .join("\n");
}

/* ----------------------------- Preparar y leer ---------------------------- */

const base64 = (file: Blob) =>
  new Promise<string>((ok, mal) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] || "");
    r.onerror = () => mal(new Error("No se pudo leer el archivo"));
    r.readAsDataURL(file);
  });

type Envio = { nombre: string; tipo: string; data?: string; texto?: string };

async function preparar(file: File): Promise<Envio> {
  const nombre = file.name || "foto.jpg";
  const ext = nombre.toLowerCase().split(".").pop() || "";
  if (file.size > MAX_BYTES) throw new Error("El archivo pesa más de 15 MB.");
  if (file.type.startsWith("image/")) {
    // Hasta 2000 px: se leen bien las facturas sin mandar fotos gigantes.
    const data = await resizeImageToBase64(file, 2000, 0.9);
    return { nombre: nombre.replace(/\.\w+$/, "") + ".jpg", tipo: "image/jpeg", data };
  }
  if (ext === "pdf" || file.type === "application/pdf") return { nombre, tipo: "application/pdf", data: await base64(file) };
  if (ext === "xlsx") {
    const buf = await file.arrayBuffer();
    return { nombre, tipo: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", data: await base64(file), texto: await textoDeExcel(buf) };
  }
  if (ext === "docx") {
    const buf = await file.arrayBuffer();
    return { nombre, tipo: file.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document", data: await base64(file), texto: await textoDeWord(buf) };
  }
  if (ext === "csv" || ext === "txt" || file.type.startsWith("text/")) {
    return { nombre, tipo: file.type || "text/plain", data: await base64(file), texto: await file.text() };
  }
  if (ext === "xls" || ext === "doc") throw new Error("Guardalo como .xlsx o .docx (o PDF) y volvé a subirlo.");
  throw new Error("Ese tipo de archivo no se puede leer. Subí una foto, un PDF, un Excel, un Word o un CSV.");
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Manda al backend (POST no-cors) y espera el resultado con el id de trabajo. */
async function enviar(envio: Envio, analizar: boolean, catalogo: string[]): Promise<ResultadoCompra> {
  const job = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const subida = fetch(SHEETS_API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "compra_archivo", job, analizar, catalogo: analizar ? catalogo : [], token: getCrmToken(), ...envio }),
  }).catch(() => undefined);
  // La lectura puede tardar (fotos largas): se consulta hasta 3 minutos.
  const limite = Date.now() + 180000;
  let terminoSubida = false;
  subida.then(() => (terminoSubida = true));
  await Promise.race([subida, espera(analizar ? 4000 : 1500)]);
  while (Date.now() < limite) {
    const r = (await api("compra_archivo_estado", { job }, 20000).catch(() => null)) as (ResultadoCompra & { pendiente?: boolean }) | null;
    if (r && r.ok === false && r.error === "auth") throw new Error("Se cerró la sesión del CRM: volvé a entrar.");
    if (r && !r.pendiente) return r;
    await espera(terminoSubida ? 1500 : 2500);
  }
  throw new Error("Tardó demasiado en leerse. Probá de nuevo o subilo en partes.");
}

/**
 * Lee una foto/archivo (se guarda en Drive) o un texto escrito. Primero prueba
 * gratis (PDF con texto, Excel, CSV o texto simple); solo si no encuentra
 * productos usa la IA. `catalogo`: renglones con los productos de la tienda.
 */
export async function leerCompra(
  entrada: { file?: File; texto?: string },
  catalogo: string[],
  marcas: string[] = [],
): Promise<ResultadoCompra & { gratis?: boolean }> {
  const envio: Envio = entrada.file ? await preparar(entrada.file) : { nombre: "", tipo: "text/plain", texto: entrada.texto ?? "" };
  if (!envio.data && !envio.texto?.trim()) throw new Error("No hay nada para leer.");
  let gratis: AnalisisCompra | null = null;
  try {
    gratis = entrada.file ? await leerArchivoGratis(entrada.file, envio.texto, marcas) : leerTextoEscrito(envio.texto ?? "", marcas);
  } catch {
    gratis = null; // si falla el lector gratis, se usa la IA
  }
  if (gratis) {
    // Igual se guarda el archivo en Drive, pero sin pasar por la IA.
    const r = envio.data ? await enviar(envio, false, catalogo) : { ok: true };
    return { ...r, ok: true, analisis: gratis, gratis: true };
  }
  return enviar(envio, true, catalogo);
}
