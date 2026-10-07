"use client";

import { gsap } from "gsap";

/**
 * Utilidades de movimiento de la tienda (GSAP). Solo transform/opacity.
 * Todo respeta "reducir movimiento": en ese caso no se anima nada.
 */

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * "Agregar al carrito": una copia de la imagen del producto vuela hasta el
 * ícono del carrito del header ([data-cart-target]) y se encoge. No toca el
 * carrito en sí: la lógica de addItem es la de siempre.
 */
export function flyToCart(from: Element | null | undefined): void {
  if (!from || prefersReducedMotion()) return;
  const target = document.querySelector("[data-cart-target]");
  if (!target) return;

  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  if (!a.width || !b.width) return;

  const size = Math.min(a.width, a.height, 120);
  const clone = document.createElement("div");
  const src = from instanceof HTMLImageElement ? from.currentSrc || from.src : "";
  clone.setAttribute("aria-hidden", "true");
  Object.assign(clone.style, {
    position: "fixed",
    left: `${a.left + a.width / 2 - size / 2}px`,
    top: `${a.top + a.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "14px",
    backgroundImage: src ? `url("${src}")` : "none",
    backgroundColor: src ? "transparent" : "rgb(var(--color-accent))",
    backgroundSize: "cover",
    backgroundPosition: "center",
    boxShadow: "0 10px 32px rgb(33 41 227 / 0.25)",
    zIndex: "120",
    pointerEvents: "none",
    willChange: "transform, opacity",
  } as CSSStyleDeclaration);
  document.body.appendChild(clone);

  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);

  const tl = gsap.timeline({ onComplete: () => clone.remove() });
  // Pequeño "salto" y luego vuela en arco hacia el carrito.
  tl.to(clone, { y: -24, scale: 1.08, duration: 0.18, ease: "power2.out" })
    .to(clone, { x: dx, duration: 0.6, ease: "power2.inOut" }, "arc")
    .to(clone, { y: dy, duration: 0.6, ease: "power1.in" }, "arc")
    .to(clone, { scale: 0.18, autoAlpha: 0.2, duration: 0.6, ease: "power2.in" }, "arc");
}
