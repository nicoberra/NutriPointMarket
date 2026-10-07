"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Video de fondo decorativo: sin audio, en loop, inline (no abre pantalla
 * completa en iPhone). Elige la versión vertical en celu y la horizontal en
 * compu. Se pausa cuando no está en pantalla (batería/CPU) y, si el usuario
 * pidió "reducir movimiento", no se reproduce: queda el poster (la foto).
 * Mientras carga se ve el poster; el video aparece con un fundido.
 */
export function BackgroundVideo({
  desktop,
  mobile,
  poster,
  className = "",
}: {
  desktop: string;
  mobile?: string;
  poster?: string;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // Fuente según el ancho de pantalla (se decide en el cliente).
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const pick = () => setSrc(mq.matches && mobile ? mobile : desktop);
    pick();
    mq.addEventListener("change", pick);
    return () => mq.removeEventListener("change", pick);
  }, [desktop, mobile]);

  // Reproducir solo en pantalla y solo si el usuario no pidió menos movimiento.
  useEffect(() => {
    const v = ref.current;
    if (!v || !src) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      v.pause();
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      },
      { threshold: 0.05 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [src]);

  return (
    <video
      ref={ref}
      key={src ?? "none"}
      src={src ?? undefined}
      poster={poster}
      muted
      loop
      playsInline
      autoPlay
      preload="metadata"
      aria-hidden
      onCanPlay={() => setReady(true)}
      className={`h-full w-full object-cover transition-opacity duration-700 ease-out ${
        ready ? "opacity-100" : "opacity-0"
      } ${className}`}
    />
  );
}
