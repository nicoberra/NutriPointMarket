/**
 * Memoria compartida de las pestañas de la planilla para el CRM.
 *
 * - Muestra al instante lo último que se cargó (memoria de la sesión) y lo
 *   actualiza en segundo plano: cambiar de sección no vuelve a "Cargando…".
 * - Si dos partes del CRM piden la misma pestaña a la vez, se hace UNA sola
 *   llamada (cada llamada a Apps Script tarda 1,5 a 3 s).
 * - Avisa a quien esté mostrando la pestaña cuando llegan datos nuevos.
 * - Si los datos se bajaron hace menos de 40 s, no los vuelve a pedir.
 * Se guarda en este navegador (localStorage) para abrir el CRM al instante
 * aunque se haya cerrado; se borra al cerrar sesión.
 */
import { listTable } from "@/lib/api";

type Row = Record<string, unknown>;
const mem = new Map<string, Row[]>();
const inflight = new Map<string, Promise<Row[]>>();
const subs = new Map<string, Set<(rows: Row[]) => void>>();
const KEY = "sm-crm-tabla:";
const FRESCO_MS = 40000;
const bajadoEn = new Map<string, number>(); // última descarga de cada pestaña en esta sesión

/** Datos ya cargados de una pestaña (o null si nunca se cargó en esta sesión). */
export function peekTable<T = Row>(tab: string): T[] | null {
  if (mem.has(tab)) return mem.get(tab) as unknown as T[];
  try {
    const raw = localStorage.getItem(KEY + tab);
    if (raw) {
      const data = JSON.parse(raw) as Row[];
      mem.set(tab, data);
      return data as unknown as T[];
    }
  } catch {
    /* ignore */
  }
  return null;
}

function store(tab: string, data: Row[]) {
  mem.set(tab, data);
  try {
    localStorage.setItem(KEY + tab, JSON.stringify(data));
  } catch {
    /* ignore (sin espacio o modo privado) */
  }
  subs.get(tab)?.forEach((fn) => fn(data));
}

/** Pide la pestaña al servidor (comparte la llamada si ya hay una en curso). */
export function fetchTable<T = Row>(tab: string): Promise<T[]> {
  const cur = inflight.get(tab);
  if (cur) return cur as unknown as Promise<T[]>;
  const p = listTable<Row>(tab)
    .then((data) => {
      bajadoEn.set(tab, Date.now());
      store(tab, data);
      return data;
    })
    .finally(() => inflight.delete(tab));
  inflight.set(tab, p);
  return p as unknown as Promise<T[]>;
}

/** Como fetchTable, pero si ya se bajó hace menos de 40 s usa lo que hay. */
export function ensureTable<T = Row>(tab: string): Promise<T[]> {
  const t = bajadoEn.get(tab);
  const cur = peekTable<T>(tab);
  if (cur && t && Date.now() - t < FRESCO_MS) return Promise.resolve(cur);
  return fetchTable<T>(tab);
}

/** Escucha los datos nuevos de una pestaña. Devuelve la función para dejar de escuchar. */
export function subscribeTable(tab: string, fn: (rows: Row[]) => void): () => void {
  if (!subs.has(tab)) subs.set(tab, new Set());
  subs.get(tab)!.add(fn);
  return () => subs.get(tab)?.delete(fn);
}

/** Cambio local inmediato (por ejemplo, al borrar o marcar algo) mientras se guarda. */
export function patchTable(tab: string, fn: (rows: Row[]) => Row[]) {
  const cur = peekTable(tab);
  if (cur) store(tab, fn(cur));
}

/** Precarga en segundo plano (al entrar al CRM). */
export function prefetchTables(...tabs: string[]) {
  for (const t of tabs) ensureTable(t).catch(() => {});
}

/** Se borra todo (al cerrar sesión). */
export function clearTables() {
  mem.clear();
  bajadoEn.clear();
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(KEY)) localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}
