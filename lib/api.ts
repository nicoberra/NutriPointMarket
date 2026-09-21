import type { Product, CategorySlug } from "./types";
import { SHEETS_API_URL } from "./config";

/**
 * Cliente JSONP para hablar con el backend (Google Apps Script).
 * Apps Script no manda CORS, así que las LECTURAS se hacen con JSONP
 * (se inyecta un <script> con ?callback=). Las escrituras se hacen aparte
 * con fetch no-cors (fire-and-forget) desde el CRM.
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

/** Convierte un valor cualquiera de la planilla a booleano. */
function toBool(v: unknown): boolean {
  return v === true || v === "TRUE" || v === "true" || v === 1 || v === "1";
}

/** Convierte un valor a lista (acepta array o string separado por comas). */
function toList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === "string")
    return v
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  return [];
}

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Normaliza un producto crudo de la planilla al tipo Product de la tienda. */
export function normalizeProduct(raw: Record<string, unknown>): Product {
  const oldPrice = toNum(raw.oldPrice, 0);
  return {
    id: String(raw.id ?? ""),
    slug: String(raw.slug ?? ""),
    name: String(raw.name ?? ""),
    brand: String(raw.brand ?? ""),
    category: String(raw.category ?? "proteinas") as CategorySlug,
    description: String(raw.description ?? ""),
    price: toNum(raw.price, 0),
    oldPrice: oldPrice > 0 ? oldPrice : undefined,
    discount: toNum(raw.discount, 0),
    images: toList(raw.images),
    stock: toNum(raw.stock, 0),
    flavors: toList(raw.flavors),
    presentations: toList(raw.presentations),
    featured: toBool(raw.featured),
    bestSeller: toBool(raw.bestSeller),
    freeShipping: toBool(raw.freeShipping),
    isNew: toBool(raw.isNew),
    rating: toNum(raw.rating, 0),
    reviews: toNum(raw.reviews, 0),
  };
}

interface ProductosResponse {
  ok?: boolean;
  data?: Record<string, unknown>[];
}

/** Trae los productos desde la planilla (vía la API de Apps Script). */
export async function fetchProducts(): Promise<Product[]> {
  const res = await jsonp<ProductosResponse>(
    `${SHEETS_API_URL}?action=productos_list`,
  );
  if (!res || res.ok === false || !Array.isArray(res.data)) {
    throw new Error("Respuesta inválida de la API");
  }
  return res.data
    .map(normalizeProduct)
    .filter((p) => p.slug && p.name); // descartar filas vacías/incompletas
}

/* ===================== API DEL CRM (lectura y escritura) ===================== */

type ApiResult<T = unknown> = { ok?: boolean; error?: string; data?: T; [k: string]: unknown };

/** Llamada genérica a la API por JSONP (sirve para leer y escribir). */
export function api<T = unknown>(
  action: string,
  params: Record<string, string | number | boolean> = {},
): Promise<ApiResult<T>> {
  const qs = new URLSearchParams({ action });
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
  return jsonp<ApiResult<T>>(`${SHEETS_API_URL}?${qs.toString()}`);
}

/** Login del CRM: valida el PIN contra el backend. */
export async function crmLogin(pin: string): Promise<boolean> {
  try {
    const r = await api("crm_login", { pin });
    return r.ok === true;
  } catch {
    return false;
  }
}

/** Lista las filas de una pestaña (Clientes, Pedidos, Seguimientos). */
export async function listTable<T = Record<string, unknown>>(
  tab: string,
): Promise<T[]> {
  const r = await api<T[]>("list", { tab });
  return Array.isArray(r.data) ? r.data : [];
}

/** Guarda (crea o actualiza) un producto en la planilla. */
export async function saveProduct(product: Partial<Product>): Promise<boolean> {
  const payload = { ...product };
  // arrays → texto separado por comas (como los guarda la planilla)
  const data = JSON.stringify({
    ...payload,
    flavors: (payload.flavors ?? []).join(", "),
    presentations: (payload.presentations ?? []).join(", "),
    images: (payload.images ?? []).join(", "),
  });
  const r = await api("productos_save", { data });
  return r.ok !== false;
}

/** Crea una fila en una pestaña. */
export async function addRow(
  tab: string,
  obj: Record<string, unknown>,
): Promise<boolean> {
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
