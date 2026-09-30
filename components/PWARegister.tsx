"use client";

import { useEffect } from "react";

/**
 * Registra el Service Worker de la PWA. No renderiza nada.
 * El SW usa network-first, así que no afecta la carga de datos dinámicos.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* si falla el registro, la app sigue funcionando normal */
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
  }, []);

  return null;
}
