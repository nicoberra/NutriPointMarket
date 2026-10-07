import type { Product, CategorySlug } from "./types";
import { SHEETS_API_URL, listPrice } from "./config";
import { discountPercent } from "./format";
import { categories } from "@/data/categories";

/** Quita acentos y pasa a minúsculas (para comparar/armar slugs). */
function deaccent(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Convierte una URL de imagen de `raw.githubusercontent.com` (del repo) en una
 * ruta local del propio dominio. El archivo ya está publicado junto al sitio
 * (ej. /productos/x.jpg), así que servirlo desde el mismo origen (Cloudflare)
 * carga al instante y de forma confiable, en vez de depender de GitHub raw
 * (lento y a veces no carga). Si no coincide el patrón, devuelve la URL igual.
 */
export function localAsset(url: unknown): string {
  const s = String(url ?? "").trim();
  if (!s) return "";
  return s.replace(
    /^https?:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\/public\//i,
    "/",
  );
}

/** Base donde el backend guarda las fotos (debe coincidir con Codigo.gs). */
const GITHUB_RAW_BASE = "https://raw.githubusercontent.com/nicoberra/NutriPointMarket/main/public";

/**
 * Inversa de localAsset: la planilla guarda la URL completa de GitHub, así que
 * para borrar/comparar hay que mandar esa misma URL, no la ruta local.
 */
export function rawAsset(url: unknown): string {
  const s = String(url ?? "").trim();
  if (!s) return "";
  return s.startsWith("/") ? GITHUB_RAW_BASE + s : s;
}

/**
 * Limpia la marca: si viene "Star nutricion / Star Nutricion" (combos que
 * juntaron la misma marca con distinta mayúscula), deja una sola.
 */
export function cleanBrand(raw: unknown): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const p of String(raw ?? "").split("/")) {
    const t = p.trim();
    const k = t.toLowerCase();
    if (t && !seen.has(k)) {
      seen.add(k);
      parts.push(t);
    }
  }
  return parts.join(" / ");
}

/** Genera un slug de URL a partir del nombre del producto. */
export function slugify(name: string): string {
  return deaccent(String(name))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Convierte el texto de "Categoría" de la planilla a un slug conocido. */
export function normalizeCategory(text: string): CategorySlug {
  const t = deaccent(String(text).trim());
  if (!t) return "proteinas";
  for (const c of categories) {
    if (deaccent(c.slug) === t || deaccent(c.name) === t) return c.slug;
  }
  // coincidencia parcial (ej: "proteina", "pre-entreno", "barras")
  for (const c of categories) {
    const key = deaccent(c.name);
    if (t.includes(key) || key.includes(t)) return c.slug;
  }
  if (t.includes("pre")) return "pre-entreno";
  if (t.includes("barra") || t.includes("snack")) return "barras-snacks";
  return "proteinas";
}

/**
 * Cliente JSONP para hablar con el backend (Google Apps Script).
 * Apps Script no manda CORS → las lecturas (y también las escrituras) se hacen
 * por JSONP inyectando un <script> con ?callback=.
 */
export function jsonp<T = unknown>(url: string, timeoutMs = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const cb = "npm_cb_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    let settled = false;

    const cleanup = () => {
      // Dejamos un no-op en vez de borrar el callback: si la respuesta llega
      // tarde (después del timeout), el script igual se ejecuta y, si el
      // callback no existiera, tiraría un ReferenceError en consola.
      (window as unknown as Record<string, unknown>)[cb] = () => {};
      script.remove();
      clearTimeout(timer);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("JSONP timeout"));
    }, timeoutMs);

    (window as unknown as Record<string, unknown>)[cb] = (data: T) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(data);
    };
    script.src = url + (url.includes("?") ? "&" : "?") + "callback=" + cb;
    script.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("JSONP error de red"));
    };
    document.body.appendChild(script);
  });
}

type ApiResult<T = unknown> = { ok?: boolean; error?: string; data?: T; [k: string]: unknown };

/** Llamada genérica a la API por JSONP (leer y escribir). */
/* ------------------------- Token de sesión del CRM ------------------------ */
// El backend exige este token para toda acción de administración. Lo devuelve
// crm_login (vence a los 30 días) y se guarda en este navegador.
const CRM_TOKEN_KEY = "sm-crm-token";
export function getCrmToken(): string {
  try {
    return localStorage.getItem(CRM_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}
export function setCrmToken(token: string): void {
  try {
    if (token) localStorage.setItem(CRM_TOKEN_KEY, token);
    else localStorage.removeItem(CRM_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
/** Evento que escucha el CRM: el backend rechazó el token → volver al login. */
export const CRM_AUTH_EVENT = "sm-crm-auth";

export function api<T = unknown>(
  action: string,
  params: Record<string, string | number | boolean> = {},
  // Apps Script a veces tarda más de 8 s (sobre todo al escribir en la
  // planilla); con 8 s el CRM daba por fallida una acción que sí se hizo.
  timeoutMs = 15000,
): Promise<ApiResult<T>> {
  const qs = new URLSearchParams({ action });
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
  // Si hay sesión de CRM en este navegador, se manda el token (las acciones
  // públicas lo ignoran; las de admin lo exigen).
  const token = getCrmToken();
  if (token) qs.set("token", token);
  return jsonp<ApiResult<T>>(`${SHEETS_API_URL}?${qs.toString()}`, timeoutMs).then((r) => {
    if (r && r.ok === false && r.error === "auth") {
      setCrmToken("");
      try {
        window.dispatchEvent(new Event(CRM_AUTH_EVENT));
      } catch {
        /* ignore */
      }
    }
    return r;
  });
}

/* =========================== PRODUCTOS (planilla) ========================= */

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function toBool(v: unknown): boolean {
  return (
    v === true ||
    ["si", "sí", "true", "x", "1"].includes(String(v).trim().toLowerCase())
  );
}
function toList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  return String(v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parsea el texto de variantes. Soporta "Rojo:5, Azul:3" (con stock) y
 * "Rojo, Azul" (sin seguimiento de stock → qty null).
 */
export function parseVariants(raw: unknown): { name: string; qty: number | null }[] {
  return String(raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const idx = part.lastIndexOf(":");
      if (idx > 0) {
        const name = part.slice(0, idx).trim();
        const qtyStr = part.slice(idx + 1).trim();
        return { name, qty: qtyStr === "" ? null : Number(qtyStr) || 0 };
      }
      return { name: part, qty: null };
    })
    .filter((v) => v.name);
}

/** Convierte una fila cruda de la planilla en un Product de la tienda. */
/** Parsea el JSON de fotos por variante { "Rojo": ["url1","url2"] }. */
export function parseVariantImages(raw: unknown): Record<string, string[]> {
  try {
    const o = JSON.parse(String(raw ?? "") || "{}");
    if (!o || typeof o !== "object") return {};
    const out: Record<string, string[]> = {};
    for (const k of Object.keys(o)) {
      const v = (o as Record<string, unknown>)[k];
      out[k] = (Array.isArray(v) ? v.map(String) : v ? [String(v)] : [])
        .map(localAsset)
        .filter(Boolean);
    }
    return out;
  } catch {
    return {};
  }
}

/** Parsea el JSON de combo [{n,q}]. */
export function parseCombo(raw: unknown): { n: string; q: number }[] | undefined {
  try {
    const a = JSON.parse(String(raw ?? "") || "[]");
    if (!Array.isArray(a) || !a.length) return undefined;
    return a
      .map((x) => ({ n: String(x.n ?? "").trim(), q: Number(x.q) || 1 }))
      .filter((x) => x.n);
  } catch {
    return undefined;
  }
}

export function buildProduct(row: Record<string, unknown>): Product {
  const nombre = String(row.nombre ?? "").trim();
  const imgs = String(row.imagen ?? "")
    .split("|")
    .map((s) => localAsset(s.trim()))
    .filter(Boolean);
  // La planilla guarda el precio CON transferencia (el del CRM). La web
  // publica ese precio + margen (listPrice); con transferencia vuelve al base.
  const base = toNum(row.precio);
  const baseML = toNum(row.precioML);
  const precio = listPrice(base);
  const precioML = listPrice(baseML);
  const oldPrice = precioML > precio ? precioML : undefined;
  // El slug se genera del nombre de la categoría (categorías dinámicas).
  const categoriaTxt = String(row.categoria ?? "").trim();
  const category = categoriaTxt ? slugify(categoriaTxt) : "proteinas";
  return {
    id: slugify(nombre),
    slug: slugify(nombre),
    name: nombre,
    brand: cleanBrand(row.marca),
    category,
    description: String(row.descripcion ?? "").trim(),
    usage: String(row.modoUso ?? "").trim() || undefined,
    nutrition: String(row.infoNutricional ?? "").trim() || undefined,
    ingredients: String(row.ingredientes ?? "").trim() || undefined,
    combo: parseCombo(row.combo),
    price: precio,
    oldPrice,
    basePrice: base,
    baseOldPrice: baseML > base ? baseML : undefined,
    discount: discountPercent(precio, oldPrice),
    image: imgs[0],
    images: imgs,
    variantImages: parseVariantImages(row.variantesFotos),
    stock: 0,
    inStock: row.stock === undefined || row.stock === "" ? true : toBool(row.stock),
    stockQty: toNum(row.cantidad),
    flavors: parseVariants(row.variantes).map((v) => v.name),
    variants: parseVariants(row.variantes),
    presentations: [],
    cost: toNum(row.costo),
    costCurrency: String(row.costoMoneda ?? "").toUpperCase() === "USD" ? "USD" : "ARS",
    featured: toBool(row.destacado),
    bestSeller: false,
    freeShipping: false,
    isNew: false,
    rating: 0,
    reviews: 0,
  };
}

/** Trae TODOS los productos desde la planilla. */
export async function fetchProducts(): Promise<Product[]> {
  const res = await api<Record<string, unknown>[]>("productos_list");
  if (!res || res.ok === false || !Array.isArray(res.data)) {
    throw new Error("Respuesta inválida de la API");
  }
  return res.data.map(buildProduct).filter((p) => p.slug && p.name);
}

/* ======================= CUENTAS DE CLIENTES (tienda) ===================== */

/** SHA-256 en hex del texto (para no mandar la contraseña en texto plano). */
async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface AuthUser {
  nombre: string;
  email: string;
}
export interface AuthResult {
  ok: boolean;
  error?: string;
  user?: AuthUser;
}

/**
 * Registra un cliente en la planilla (pestaña Clientes). La contraseña se
 * hashea en el navegador antes de viajar; el backend la vuelve a hashear.
 */
export async function registerUser(
  nombre: string,
  email: string,
  password: string,
  telefono = "",
): Promise<AuthResult> {
  try {
    const pass = await sha256Hex(password);
    const data = JSON.stringify({
      nombre,
      email: email.trim().toLowerCase(),
      password: pass,
      telefono,
      origen: "web",
    });
    const r = (await api("registrar", { data })) as ApiResult & { user?: AuthUser };
    if (r.ok === true) return { ok: true, user: r.user };
    return { ok: false, error: r.error || "No se pudo crear la cuenta" };
  } catch {
    return { ok: false, error: "No se pudo conectar. Probá de nuevo." };
  }
}

/** Valida email + contraseña contra la planilla. */
export async function loginUser(email: string, password: string): Promise<AuthResult> {
  try {
    const pass = await sha256Hex(password);
    const r = (await api("login", {
      email: email.trim().toLowerCase(),
      password: pass,
    })) as ApiResult & { user?: AuthUser };
    if (r.ok === true) return { ok: true, user: r.user };
    return { ok: false, error: r.error || "No se pudo ingresar" };
  } catch {
    return { ok: false, error: "No se pudo conectar. Probá de nuevo." };
  }
}

/* ============================ API DEL CRM ================================= */

export type CrmLoginResult =
  | { ok: true }
  | { ok: false; reason: "pin" | "conn" | "blocked"; restantes?: number };

/** Cierra la sesión del CRM: revoca el token en el backend y lo borra acá. */
export async function crmLogout(): Promise<void> {
  const token = getCrmToken();
  setCrmToken("");
  if (!token) return;
  try {
    await api("crm_logout", { token }, 8000);
  } catch {
    /* el token igual queda borrado localmente */
  }
}

/**
 * Login del CRM: valida el PIN contra el backend. Distingue "PIN incorrecto" de
 * "no se pudo conectar" (antes cualquier falla de red se mostraba como PIN mal).
 * Reintenta ante fallas de red/JSONP (típico en 4G o WiFi lento).
 */
export async function crmLogin(pin: string): Promise<CrmLoginResult> {
  const intentos = 3;
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await api("crm_login", { pin });
      if (r.ok === true) {
        // Guarda el token de sesión: desde ahora viaja en cada llamada de admin.
        setCrmToken(String((r as { token?: string }).token || ""));
        return { ok: true };
      }
      // El backend respondió: si es un problema de configuración, es de conexión
      // para el usuario, no un PIN mal.
      if (r.error && /no configurado/i.test(String(r.error))) return { ok: false, reason: "conn" };
      if (r.error === "bloqueado") return { ok: false, reason: "blocked" };
      return { ok: false, reason: "pin", restantes: Number((r as { restantes?: number }).restantes) };
    } catch {
      // Falla de red/JSONP → reintenta; si se agotan, es problema de conexión.
      if (i === intentos - 1) return { ok: false, reason: "conn" };
    }
  }
  return { ok: false, reason: "conn" };
}

/** Lista filas de una pestaña (Clientes, Pedidos, Seguimientos). */
export async function listTable<T = Record<string, unknown>>(tab: string): Promise<T[]> {
  const r = await api<T[]>("list", { tab });
  return Array.isArray(r.data) ? r.data : [];
}

/** Guarda (crea o actualiza) un producto en la planilla, cruzando por nombre. */
export interface ProductInput {
  nombre: string;
  marca?: string;
  categoria?: string;
  precio: number;
  precioML?: number;
  variantes?: string;
  stock: boolean;
  destacado: boolean;
  /** "" = no tocar el costo guardado en la planilla (el backend ignora vacíos). */
  costo?: number | "";
  costoMoneda?: "USD" | "ARS" | "";
  cantidad?: number;
  descripcion?: string;
  modoUso?: string;
  infoNutricional?: string;
  ingredientes?: string;
  combo?: string;
}

export async function saveProduct(row: ProductInput): Promise<boolean> {
  const data = JSON.stringify({
    nombre: row.nombre,
    marca: row.marca ?? "",
    categoria: row.categoria ?? "",
    precio: row.precio,
    precioML: row.precioML ?? "",
    variantes: row.variantes ?? "",
    stock: row.stock,
    destacado: row.destacado,
    costo: row.costo ?? "",
    costoMoneda: row.costoMoneda ?? "ARS",
    cantidad: row.cantidad ?? "",
    descripcion: row.descripcion ?? "",
    modoUso: row.modoUso ?? "",
    infoNutricional: row.infoNutricional ?? "",
    ingredientes: row.ingredientes ?? "",
    combo: row.combo ?? "",
  });
  const r = await api("productos_save", { data });
  return r.ok !== false;
}

/** Crea una fila en una pestaña. */
export async function addRow(tab: string, obj: Record<string, unknown>): Promise<boolean> {
  const r = await api("add", { tab, data: JSON.stringify(obj) });
  return r.ok !== false;
}

/** Actualiza una fila por id. */
export async function updateRow(
  tab: string,
  id: string,
  obj: Record<string, unknown>,
): Promise<boolean> {
  const r = await api("update", { tab, id, data: JSON.stringify(obj) });
  return r.ok !== false;
}

/** Borra una fila por id. */
export async function deleteRow(tab: string, id: string): Promise<boolean> {
  const r = await api("delete", { tab, id });
  return r.ok !== false;
}

/* ============================== IMÁGENES ================================= */

/**
 * Redimensiona una imagen (canvas) y la devuelve como base64 JPEG (sin el
 * prefijo data:). Achica para que no pese mucho al subir a GitHub.
 */
export function resizeImageToBase64(file: File, max = 1000, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width >= height && width > max) {
        height = Math.round((height * max) / width);
        width = max;
      } else if (height > width && height > max) {
        width = Math.round((width * max) / height);
        height = max;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No se pudo procesar la imagen"));
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(dataUrl.split(",")[1] || "");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

/**
 * Sube la foto de un producto: la redimensiona y la manda al backend (que la
 * guarda en GitHub y escribe el link en la columna Imagen del producto).
 * Se usa POST no-cors con text/plain porque el payload (base64) es grande.
 * La respuesta es opaca; luego hay que refrescar los productos para ver la foto.
 */
export async function uploadProductImage(
  nombre: string,
  file: File,
  variante?: string,
): Promise<void> {
  // Alta calidad: hasta 1600px y 92% (nítidas, pero sin que la web se vuelva lenta).
  const data = await resizeImageToBase64(file, 1600, 0.92);
  await fetch(SHEETS_API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "subir_imagen",
      nombre,
      data,
      variante: variante ?? "",
      token: getCrmToken(),
    }),
  });
}

/** Borra la referencia a una foto (de la galería por url, o de una variante). */
export async function deleteProductImage(
  nombre: string,
  opts: { url?: string; variante?: string },
): Promise<boolean> {
  const r = await api(
    "borrar_imagen",
    {
      nombre,
      // La planilla guarda la URL completa de GitHub: convertimos la ruta
      // local (con la que se muestra) a esa URL para que el backend la encuentre.
      url: rawAsset(opts.url),
      variante: opts.variante ?? "",
    },
    20000,
  );
  return r.ok !== false;
}

/** Sube la foto de una categoría (se guarda en GitHub y en la columna Imagen). */
export async function uploadCategoryImage(categoria: string, file: File): Promise<void> {
  const data = await resizeImageToBase64(file, 1200, 0.9);
  await fetch(SHEETS_API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "subir_imagen",
      nombre: categoria,
      categoria,
      data,
      token: getCrmToken(),
    }),
  });
}

export async function deleteCategoryImage(categoria: string): Promise<boolean> {
  const r = await api("borrar_imagen", { categoria });
  return r.ok !== false;
}

/** Guarda un email suscripto en la planilla (pestaña Suscriptores). */
export async function subscribeEmail(email: string): Promise<boolean> {
  return addRow("Suscriptores", { email: email.trim().toLowerCase() });
}

/** Sube el comprobante de transferencia de un pedido (se guarda en GitHub). */
export async function uploadComprobante(pedido: string, file: File): Promise<void> {
  const data = await resizeImageToBase64(file, 1400, 0.88);
  await fetch(SHEETS_API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "subir_comprobante", pedido, data }),
  });
}

/* ========================== PEDIDOS / PAGOS ============================== */

export interface OrderInput {
  id: string;
  cliente: string;
  telefono: string;
  email: string;
  detalle: string;
  monto: number;
  montoEnvio: number;
  envio: string; // dirección
  metodo: string; // "Transferencia" | "Mercado Pago"
  items?: string; // JSON de los productos: [{n,v,q}]
}

/** Aprueba el pago de un pedido en el CRM: descuenta el stock y lo marca pagado. */
export async function aprobarPedido(id: string): Promise<boolean> {
  const r = await api("aprobar_pedido", { id }, 15000);
  return r.ok !== false;
}

/**
 * Guarda un pedido en la planilla (pestaña Pedidos). Timeout largo (18s) porque
 * en 4G/WiFi lento el guardado tarda. NO se reintenta para no duplicar pedidos.
 */
export async function createOrder(o: OrderInput): Promise<boolean> {
  const estado = o.metodo === "Mercado Pago" ? "pendiente de pago" : "nuevo";
  const r = await api("add", {
    tab: "Pedidos",
    data: JSON.stringify({
      id: o.id,
      cliente: o.cliente,
      telefono: o.telefono,
      detalle: o.detalle,
      monto: o.monto,
      estado,
      notas: `Email: ${o.email}`,
      envio: o.envio,
      montoEnvio: o.montoEnvio,
      pago: o.metodo,
      items: o.items ?? "",
      descontado: "no",
    }),
  }, 18000);
  return r.ok !== false;
}

/**
 * Crea una preferencia de pago en Mercado Pago (vía backend, que tiene el
 * Access Token) y devuelve el link (init_point) al que hay que redirigir.
 */
export async function mpCreatePreference(args: {
  pedido: string;
  monto: number;
  titulo: string;
  email: string;
}): Promise<string | null> {
  // Reintenta ante fallas de red (crear una preferencia extra es inofensivo).
  for (let i = 0; i < 3; i++) {
    try {
      const r = (await api("mp_crear_pref", {
        pedido: args.pedido,
        monto: args.monto,
        titulo: args.titulo,
        email: args.email,
      }, 18000)) as ApiResult & { init_point?: string };
      if (r.ok && r.init_point) return r.init_point;
      if (r.ok === false) return null; // el backend respondió con un error real
    } catch {
      if (i === 2) return null; // se agotaron los reintentos
    }
  }
  return null;
}

/* ----------------------------- Categorías -------------------------------- */

export interface CategoryRow {
  nombre: string;
  orden?: number | string;
  imagen?: string;
}

/** Lista las categorías desde la planilla, ordenadas. */
export async function fetchCategories(): Promise<CategoryRow[]> {
  const rows = await listTable<CategoryRow>("Categorias");
  return rows
    .filter((r) => String(r.nombre ?? "").trim())
    .sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0));
}

/** Agrega una categoría nueva. */
export async function addCategory(nombre: string, orden: number): Promise<boolean> {
  return addRow("Categorias", { nombre: nombre.trim(), orden });
}

/** Renombra una categoría (arrastra el cambio a los productos). */
/** Renombra un producto (y actualiza los combos que lo incluyen). Acción de admin. */
export async function renameProduct(from: string, to: string): Promise<boolean> {
  const r = await api("producto_rename", { from, to: to.trim() }, 20000);
  return r.ok !== false;
}

export async function renameCategory(from: string, to: string): Promise<boolean> {
  const r = await api("categoria_rename", { from, to: to.trim() });
  return r.ok !== false;
}

/** Borra una categoría. */
export async function deleteCategory(nombre: string): Promise<boolean> {
  return deleteRow("Categorias", nombre);
}
