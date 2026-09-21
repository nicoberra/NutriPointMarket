"use client";

import { useEffect, useState } from "react";
import { PROMO_MESSAGES } from "@/lib/config";

/**
 * Barra promocional superior de ancho completo.
 * En desktop muestra los 3 mensajes; en mobile rota como carrusel automático.
 */
export function TopBar() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setIndex((i) => (i + 1) % PROMO_MESSAGES.length),
      3500,
    );
    return () => clearInterval(t);
  }, []);

  return (
    <div className="bg-primary text-white">
      <div className="container-page">
        {/* Desktop: los tres mensajes */}
        <div className="hidden items-center justify-center gap-8 py-2 text-xs font-medium tracking-wide sm:flex">
          {PROMO_MESSAGES.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>

        {/* Mobile: carrusel automático */}
        <div className="relative h-8 overflow-hidden sm:hidden" aria-live="polite">
          {PROMO_MESSAGES.map((m, i) => (
            <span
              key={m}
              className="absolute inset-0 flex items-center justify-center text-xs font-medium transition-opacity duration-500"
              style={{ opacity: i === index ? 1 : 0 }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
