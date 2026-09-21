import type { Product } from "./types";
import { SHEETS_API_URL } from "./config";
import { discountPercent } from "./format";

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
): Promise<ApiResult<T>> {
  const qs = new URLSearchParams({ action });
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v));
  return jsonp<ApiResult<T>>(`${SHEETS_API_URL}?${qs.toString()}`);
}

/* =========================== PRECIOS (planilla) =========================== */

/** Fila de precio tal como la devuelve la planilla. */
export interface PriceRow {
  nombre: string;
  precio: number;
  stock: boolean;
  precioML: number;
  destacado: boolean;
}

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

/** Trae las filas de precios desde la planilla. */
export async function fetchPrices(): Promise<PriceRow[]> {
  const res = await api<Record<string, unknown>[]>("productos_list");
  if (!res || res.ok === false || !Array.isArray(res.data)) {
    throw new Error("Respuesta inválida de la API");
  }
  return res.data
    .map((r) => ({
      nombre: String(r.nombre ?? "").trim(),
      precio: toNum(r.precio),
      stock: toBool(r.stock),
      precioML: toNum(r.precioML),
      destacado: toBool(r.destacado),
    }))
    .filter((r) => r.nombre);
}

/**
 * Combina el CATÁLOGO (código) con los PRECIOS (planilla), cruzando por nombre.
 * Los precios pisan: precio, oldPrice (Precio ML), descuento, destacado y stock.
 */
export function mergePrices(catalog: Product[], prices: PriceRow[]): Product[] {
  const byName = new Map(prices.map((p) => [p.nombre.trim().toLowerCase(), p]));
  return catalog.map((prod) => {
    const pr = byName.get(prod.name.trim().toLowerCase());
    if (!pr) return { ...prod, inStock: prod.inStock ?? true };
    const oldPrice = pr.precioML > pr.precio ? pr.precioML : undefined;
    const price = pr.precio || prod.price;
    return {
      ...prod,
      price,
      oldPrice,
      discount: discountPercent(price, oldPrice),
      featured: pr.destacado,
      inStock: pr.stock,
    };
  });
}

/* ============================ API DEL CRM ================================= */

/** Login del CRM: valida el PIN contra el backend. */
export async function crmLogin(pin: string): Promise<boolean> {
  try {
    const r = await api("crm_login", { pin });
    return r.ok === true;
  } catch {
    return false;
  }
}

/** Lista filas de una pestaña (Clientes, Pedidos, Seguimientos). */
export async function listTable<T = Record<string, unknown>>(tab: string): Promise<T[]> {
  const r = await api<T[]>("list", { tab });
  return Array.isArray(r.data) ? r.data : [];
}

/** Guarda (crea o actualiza) el precio de un producto, cruzando por nombre. */
export async function saveProduct(row: {
  nombre: string;
  precio: number;
  precioML?: number;
  stock: boolean;
  destacado: boolean;
}): Promise<boolean> {
  const data = JSON.stringify({
    nombre: row.nombre,
    precio: row.precio,
    precioML: row.precioML ?? "",
    stock: row.stock,
    destacado: row.destacado,
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
