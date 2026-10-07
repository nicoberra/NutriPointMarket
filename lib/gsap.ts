"use client";

/**
 * Punto único de registro de GSAP y sus plugins (todos gratuitos desde 3.13).
 * Importar SIEMPRE desde acá en componentes "use client": garantiza que los
 * plugins estén registrados una sola vez y que el bundle no los duplique.
 */
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Flip } from "gsap/Flip";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(useGSAP, ScrollTrigger, Flip, SplitText);

/** Media queries para gsap.matchMedia(): animar solo si el usuario lo permite. */
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const MOTION_REDUCE = "(prefers-reduced-motion: reduce)";

export { gsap, useGSAP, ScrollTrigger, Flip, SplitText };
