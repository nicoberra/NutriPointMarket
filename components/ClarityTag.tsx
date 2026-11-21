"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { CLARITY_ID } from "@/lib/config";

/** Páginas con datos de clientes: Clarity no ve su contenido (se enmascara todo). */
const PRIVADAS = /^\/(cuenta|checkout|pago)(\/|$)/;

declare global {
  interface Window {
    clarity?: ((...args: unknown[]) => void) & { q?: unknown[][] };
  }
}

/**
 * Microsoft Clarity solo en la tienda pública (este componente no está en /admin).
 * Los campos de formularios ya los enmascara Clarity por defecto (no se desactiva).
 */
export function ClarityTag() {
  const pathname = usePathname() || "/";

  useEffect(() => {
    if (!CLARITY_ID) return;
    const privada = PRIVADAS.test(pathname);
    // data-clarity-mask: Clarity no graba textos ni imágenes de esa página.
    if (privada) document.body.setAttribute("data-clarity-mask", "True");
    else document.body.removeAttribute("data-clarity-mask");
    // Se carga una sola vez, y nunca si la visita empieza en una página privada.
    if (privada || window.clarity) return;
    // Cola oficial del snippet: lo que se llame antes de que cargue el script queda guardado.
    const cola: unknown[][] = [];
    window.clarity = Object.assign((...args: unknown[]) => { cola.push(args); }, { q: cola });
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.clarity.ms/tag/" + encodeURIComponent(CLARITY_ID);
    document.head.appendChild(s);
  }, [pathname]);

  return null;
}
