// Avisos al celular del CRM (Web Push): cada compra web manda una notificación
// a los dispositivos que activaron los avisos. El aviso llega sin contenido y el
// service worker (public/sw.js) le pide el texto al backend con la clave "k"
// de este dispositivo, que se guarda en la caché "suplemarket-push".
import { api } from "./api";
import { SHEETS_API_URL } from "./config";

export type EstadoAvisos =
  | "cargando"
  | "no-soportado" // navegador sin notificaciones push
  | "ios-instalar" // iPhone: hay que abrir el CRM desde la pantalla de inicio
  | "bloqueado" // el usuario rechazó el permiso
  | "inactivo"
  | "activo";

const PUSH_CACHE = "suplemarket-push";
const MARCA = "sm-avisos-endpoint";

function esIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
function instalada(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
function soportado(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function claveABytes(b64url: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const bin = atob((b64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function nombreDispositivo(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Windows/.test(ua)) return "Windows";
  if (/Mac/.test(ua)) return "Mac";
  return "Otro";
}

export async function estadoAvisos(): Promise<EstadoAvisos> {
  if (typeof window === "undefined") return "cargando";
  if (esIOS() && !instalada()) return "ios-instalar";
  if (!soportado()) return "no-soportado";
  if (Notification.permission === "denied") return "bloqueado";
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub && Notification.permission === "granted" && localStorage.getItem(MARCA) === sub.endpoint) return "activo";
  } catch {
    /* sin SW todavía */
  }
  return "inactivo";
}

/** Activa los avisos en este dispositivo. Llamar DIRECTO desde el toque del botón. */
export async function activarAvisos(): Promise<{ ok: boolean; error?: string }> {
  if (!soportado()) return { ok: false, error: "Este navegador no permite notificaciones." };
  // El permiso se pide primero (iPhone exige que salga del toque, sin esperas antes).
  const permiso = await Notification.requestPermission();
  if (permiso !== "granted") return { ok: false, error: "No diste permiso para las notificaciones." };
  try {
    const clave = await api<{ pub: string }>("push_clave", {}, 30000);
    if (!clave.ok || !clave.data?.pub) return { ok: false, error: "No se pudo conectar con el servidor." };
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    // Si la suscripción vieja es de otra clave, se rehace.
    if (sub) {
      const actual = sub.options?.applicationServerKey;
      const nueva = claveABytes(clave.data.pub);
      const igual =
        actual && new Uint8Array(actual).length === nueva.length && new Uint8Array(actual).every((b, i) => b === nueva[i]);
      if (!igual) {
        await sub.unsubscribe();
        sub = null;
      }
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(clave.data.pub) });
    }
    const r = await api<{ k: string }>("push_suscribir", { endpoint: sub.endpoint, nombre: nombreDispositivo() }, 30000);
    if (!r.ok || !r.data?.k) return { ok: false, error: String(r.error || "No se pudo guardar este dispositivo.") };
    const cache = await caches.open(PUSH_CACHE);
    await cache.put(
      "/__avisos",
      new Response(JSON.stringify({ api: SHEETS_API_URL, k: r.data.k }), { headers: { "Content-Type": "application/json" } }),
    );
    localStorage.setItem(MARCA, sub.endpoint);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "No se pudieron activar los avisos." };
  }
}

/** Manda un aviso de prueba a todos los dispositivos activados. */
export async function probarAvisos(): Promise<{ ok: boolean; enviados: number; error?: string }> {
  const r = await api<{ enviados: number; dispositivos: number; errores?: string[] }>("push_probar", {}, 30000);
  if (!r.ok || !r.data) return { ok: false, enviados: 0, error: String(r.error || "No se pudo mandar la prueba.") };
  return {
    ok: r.data.enviados > 0,
    enviados: r.data.enviados,
    error: r.data.enviados > 0 ? undefined : (r.data.errores || [])[0] || "No hay dispositivos activados.",
  };
}

export async function desactivarAvisos(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api("push_quitar", { endpoint: sub.endpoint }, 30000);
      await sub.unsubscribe();
    }
    await caches.delete(PUSH_CACHE);
  } finally {
    localStorage.removeItem(MARCA);
  }
}
