"use client";

import { useEffect } from "react";

/**
 * Registra el Service Worker de la PWA y, cuando sale una versión nueva del
 * sitio, recarga la página sola para que se vea lo último (sin Ctrl+Shift+R).
 *
 * En el CRM (/admin) no recarga en el momento (podría cortarte una edición):
 * lo hace cuando la pestaña/app pasa a segundo plano, o en la próxima carga.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    // Si ya había un SW controlando la página, un cambio de controlador
    // significa "versión nueva instalada".
    const hadController = !!navigator.serviceWorker.controller;
    let done = false;
    const reloadNow = () => {
      if (done) return;
      done = true;
      window.location.reload();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") reloadNow();
    };
    const onControllerChange = () => {
      if (!hadController || done) return;
      if (window.location.pathname.startsWith("/admin")) {
        document.addEventListener("visibilitychange", onVisibility);
      } else {
        reloadNow();
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((reg) => {
          // Busca versión nueva en cada carga (no espera las 24 h del navegador).
          reg.update().catch(() => {});
        })
        .catch(() => {
          /* si falla el registro, la app sigue funcionando normal */
        });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
