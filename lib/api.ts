import type { Product, CategorySlug } from "./types";
import { SHEETS_API_URL } from "./config";
import { discountPercent } from "./format";
import { categories } from "@/data/categories";

/** Quita acentos y pasa a minúsculas (para comparar/armar slugs). */
function deaccent(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
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
      try {
        delete (window as unknown as Record<string, unknown>)[cb];
      } catch {
        (window as unknown as Record<string, unknown>)[cb] = undefined;
      }
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
export function api<T = unknown>(
  action: string,
  params: Record<string, string | number | boolean> = {},
  timeoutMs = 8000,
): Promise<ApiResult<T>> {
  const qs = new URLSearchParams({ action });
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
  return jsonp<ApiResult<T>>(`${SHEETS_API_URL}?${qs.toString()}`, timeoutMs);
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

/** Convierte una fila cruda de la planilla en un Product de la tienda. */
export function buildProduct(row: Record<string, unknown>): Product {
  const nombre = String(row.nombre ?? "").trim();
  const precio = toNum(row.precio);
  const precioML = toNum(row.precioML);
  const oldPrice = precioML > precio ? precioML : undefined;
  // El slug se genera del nombre de la categoría (categorías dinámicas).
  const categoriaTxt = String(row.categoria ?? "").trim();
  const category = categoriaTxt ? slugify(categoriaTxt) : "proteinas";
  return {
    id: slugify(nombre),
    slug: slugify(nombre),
    name: nombre,
    brand: String(row.marca ?? "").trim(),
    category,
    description: "",
    price: precio,
    oldPrice,
    discount: discountPercent(precio, oldPrice),
    images: [],
    stock: 0,
    inStock: row.stock === undefined || row.stock === "" ? true : toBool(row.stock),
    flavors: toList(row.variantes),
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

export type CrmLoginResult = { ok: true } | { ok: false; reason: "pin" | "conn" };

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
      if (r.ok === true) return { ok: true };
      // El backend respondió: si es un problema de configuración, es de conexión
      // para el usuario, no un PIN mal.
      if (r.error && /no configurado/i.test(String(r.error))) return { ok: false, reason: "conn" };
      return { ok: false, reason: "pin" }; // respuesta clara: PIN incorrecto
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
  costo?: number;
  costoMoneda?: "USD" | "ARS";
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
  metodo: string; // "Efectivo" | "Transferencia" | "Mercado Pago"
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
      notas: `Pago: ${o.metodo}. Email: ${o.email}`,
      envio: o.envio,
      montoEnvio: o.montoEnvio,
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
export async function renameCategory(from: string, to: string): Promise<boolean> {
  const r = await api("categoria_rename", { from, to: to.trim() });
  return r.ok !== false;
}

/** Borra una categoría. */
export async function deleteCategory(nombre: string): Promise<boolean> {
  return deleteRow("Categorias", nombre);
}
