"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP, MOTION_OK } from "@/lib/gsap";

/**
 * Revela sus hijos directos al entrar en pantalla (una sola vez), en stagger.
 * Solo transform/opacity; con "reducir movimiento" no hace nada (los hijos
 * se ven desde el principio). Al terminar limpia los estilos inline para no
 * pisar los hover de las tarjetas.
 */
export function Reveal({
  children,
  className,
  stagger = 0.08,
  y = 24,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const el = ref.current;
        if (!el) return;
        const items = Array.from(el.children);
        if (!items.length) return;
        gsap.from(items, {
          autoAlpha: 0,
          y,
          duration: 0.65,
          ease: "power3.out",
          stagger,
          clearProps: "transform,opacity,visibility",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
