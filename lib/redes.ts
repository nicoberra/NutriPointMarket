/**
 * Sección «Redes» del CRM: subir historias, posteos y reels al Drive que la
 * oficina publica, y ver / aprobar lo que la oficina tiene de Suple Market.
 * Todo pasa por el Apps Script (con el token del CRM): la clave de la oficina
 * y el acceso al Drive quedan del lado del servidor.
 */
import { SHEETS_API_URL } from "./config";
import { api, getCrmToken, setCrmToken, CRM_AUTH_EVENT } from "./api";

export type TipoPieza = "historia" | "posteo" | "reel";

export interface PiezaOficina {
  id: string;
  type: string;
  label: string;
  when: string | null;
  caption: string | null;
  previews: string[];
  video: string | null;
  approved: boolean;
  status: "pending" | "scheduled" | "published" | "failed";
}

export interface EstadoOficina {
  counts: { pending: number; scheduled: number; published: number };
  pending: PiezaOficina[];
  upcoming: PiezaOficina[];
  recent: PiezaOficina[];
}

export interface Subido {
  nombre: string;
  fecha: string;
  url: string;
  video: boolean;
  carpeta: boolean;
}

export type ListaSubidos = Record<TipoPieza, Subido[]>;

type Res<T = unknown> = { ok?: boolean; error?: string; data?: T; [k: string]: unknown };

const sinSesion = (r: Res) => {
  if (r && r.ok === false && r.error === "auth") {
    setCrmToken("");
    try {
      window.dispatchEvent(new Event(CRM_AUTH_EVENT));
    } catch {
      /* ignore */
    }
  }
  return r;
};

/** POST con respuesta legible (el Apps Script responde con CORS abierto). */
async function post<T = unknown>(body: Record<string, unknown>, timeoutMs = 60000): Promise<Res<T>> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(SHEETS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...body, token: getCrmToken() }),
      signal: ctrl.signal,
    });
    return sinSesion((await res.json()) as Res<T>) as Res<T>;
  } catch {
    return { ok: false, error: "Sin conexión o tardó demasiado" };
  } finally {
    clearTimeout(t);
  }
}

export async function estadoOficina(): Promise<{ ok: boolean; data?: EstadoOficina; error?: string }> {
  const r = (await api<EstadoOficina>("redes_estado", {}, 40000)) as Res<EstadoOficina>;
  return r.ok === false ? { ok: false, error: String(r.error || "No se pudo leer la oficina") } : { ok: true, data: r.data };
}

export async function aprobarEnOficina(
  accion: "approve" | "reject",
  opts: { ids?: string[]; todas?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const params: Record<string, string> = { accion };
  if (opts.todas) params.todas = "1";
  else params.ids = JSON.stringify(opts.ids ?? []);
  const r = await api("redes_aprobar", params, 40000);
  return r.ok === false ? { ok: false, error: String(r.error || "No se pudo") } : { ok: true };
}

export async function listaSubidos(): Promise<{ ok: boolean; data?: ListaSubidos; error?: string }> {
  const r = (await api<ListaSubidos>("redes_lista", {}, 30000)) as Res<ListaSubidos>;
  return r.ok === false ? { ok: false, error: String(r.error || "No se pudo leer el Drive") } : { ok: true, data: r.data };
}

/** Parte de un archivo en base64 (sin el prefijo data:). */
function aBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).replace(/^data:[^,]*,/, ""));
    fr.onerror = () => reject(new Error("No se pudo leer el archivo"));
    fr.readAsDataURL(blob);
  });
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Tipo del archivo (algunos celulares no lo informan: se deduce de la extensión). */
export function tipoArchivo(f: File): string {
  if (f.type) return f.type === "image/jpg" ? "image/jpeg" : f.type;
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  return ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", mp4: "video/mp4", mov: "video/quicktime", m4v: "video/x-m4v" } as Record<string, string>)[ext] || "";
}

export interface PiezaNueva {
  tipo: TipoPieza;
  nombre: string;
  texto: string;
  /** Historia: 1 foto o video. Posteo: 1 a 10 fotos (2 o más = carrusel). Reel: 1 video. */
  archivos: File[];
  /** Solo reel: portada opcional. */
  portada?: File | null;
}

/**
 * Sube una pieza entera: la crea, manda cada archivo por partes (con reintentos
 * si se corta la señal) y al final la deja en su carpeta del Drive.
 * `progreso` recibe de 0 a 1.
 */
export async function subirPieza(
  p: PiezaNueva,
  progreso: (x: number) => void,
): Promise<{ ok: boolean; nombre?: string; error?: string }> {
  const lista: { file: File; rol: string; orden: number }[] = p.archivos.map((file, i) => ({ file, rol: "", orden: i + 1 }));
  if (p.tipo === "reel" && p.portada) lista.push({ file: p.portada, rol: "portada", orden: 1 });
  const total = lista.reduce((s, x) => s + x.file.size, 0) || 1;
  let hecho = 0;
  progreso(0);

  const pz = await post<never>({ action: "redes_pieza", tipo: p.tipo, nombre: p.nombre, cantidad: p.archivos.length });
  if (pz.ok === false || !pz.pieza) return { ok: false, error: String(pz.error || "No se pudo empezar la subida") };
  const pieza = String(pz.pieza);

  for (const { file, rol, orden } of lista) {
    const ini = await post({ action: "redes_subir_inicio", pieza, mime: tipoArchivo(file), tamano: file.size, rol, orden });
    if (ini.ok === false || !ini.subida) return { ok: false, error: String(ini.error || "No se pudo subir " + file.name) };
    const parte = Number(ini.parte) || 4 * 1024 * 1024;
    let desde = 0;
    let fallos = 0;
    for (;;) {
      const trozo = file.slice(desde, Math.min(file.size, desde + parte));
      const r = await post({ action: "redes_subir_parte", subida: ini.subida, desde, data: await aBase64(trozo) }, 120000);
      if (r.ok === false) {
        // Se cortó la señal o el servidor tardó: reintenta la misma parte (el
        // servidor responde desde dónde seguir si ya la tenía).
        if (++fallos > 4 || r.error === "auth") return { ok: false, error: String(r.error || "Se cortó la subida") };
        await esperar(1500 * fallos);
        continue;
      }
      fallos = 0;
      if (r.listo) break;
      desde = Number(r.recibido) || 0;
      progreso(Math.min(0.99, (hecho + desde) / total));
    }
    hecho += file.size;
    progreso(Math.min(0.99, hecho / total));
  }

  const fin = await post({ action: "redes_terminar", pieza, texto: p.texto });
  if (fin.ok === false) return { ok: false, error: String(fin.error || "No se pudo terminar") };
  progreso(1);
  return { ok: true, nombre: String(fin.nombre || p.nombre) };
}
