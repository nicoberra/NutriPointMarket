"use client";

/**
 * Punto único de registro de GSAP y sus plugins (todos gratuitos desde 3.13).
 * Importar SIEMPRE desde acá en componentes "use client": garantiza que los
 * plugins estén registrados una sola vez y que el bundle no los duplique.
 * Flip y SplitText NO se registran acá: los importa solo el componente que los usa
 * (Catalog en diferido y HeroIntro), así las demás páginas no cargan ese peso.
 */
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/** Media queries para gsap.matchMedia(): animar solo si el usuario lo permite. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const MOTION_REDUCE = "(prefers-reduced-motion: reduce)";

/**
 * Seguro anti "contenido invisible": si una animación de ENTRADA (que arranca
 * con el elemento oculto) no terminó pasados `ms`, se fuerza al estado final.
 * Cubre pestañas sin frames (segundo plano, visores) o cualquier traba del
 * ticker: la tienda nunca queda con elementos ocultos.
 */
export function guardEntrance(anim: gsap.core.Animation, ms = 4000): void {
  const id = setTimeout(() => {
    if (anim.progress() < 1) anim.progress(1);
  }, ms);
  anim.then(() => clearTimeout(id)).catch(() => {});
}

export { gsap, useGSAP, ScrollTrigger };
