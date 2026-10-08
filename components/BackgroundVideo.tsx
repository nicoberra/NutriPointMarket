"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Video de fondo decorativo: sin audio, en loop, inline (no abre pantalla
 * completa en iPhone). Elige la versión vertical en celu y la horizontal en
 * compu. Se pausa cuando no está en pantalla (batería/CPU) y, si el usuario
 * pidió "reducir movimiento", no se reproduce: queda el poster (la foto).
 * Mientras carga se ve el poster; el video aparece con un fundido.
 * Carga anticipada: el video (y su poster) se descargan cuando la sección está a
 * ~2 pantallas de distancia (NEAR_MARGIN), pero recién DESPUÉS de que terminó de
 * cargar la página (así no compite con el logo y las fotos de arriba). Si el
 * cliente llega a la sección antes, se descarga en ese momento. Resultado: cuando
 * el cliente baja, el video ya está bajado y arranca solo.
 */
const NEAR_MARGIN = "1600px 0px";
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
  const [near, setNear] = useState(false);

  // ¿Ya está cerca la sección? Una sola vez: a partir de ahí el video se descarga.
  useEffect(() => {
    const v = ref.current;
    if (!v || near) return;
    if (!("IntersectionObserver" in window)) {
      setNear(true);
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let waitingLoad = false;
    const go = () => {
      setNear(true);
      io.disconnect();
    };
    const onLoad = () => {
      timer = setTimeout(go, 200);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        const visibleNow = e.boundingClientRect.top < window.innerHeight + 300;
        if (visibleNow || document.readyState === "complete") go();
        else if (!waitingLoad) {
          waitingLoad = true;
          window.addEventListener("load", onLoad, { once: true });
        }
      },
      { rootMargin: NEAR_MARGIN },
    );
    io.observe(v);
    return () => {
      io.disconnect();
      window.removeEventListener("load", onLoad);
      if (timer) clearTimeout(timer);
    };
  }, [near]);

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
    if (!v || !src || !near) return;
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
  }, [src, near]);

  return (
    <video
      ref={ref}
      src={near && src ? src : undefined}
      poster={near ? poster : undefined}
      muted
      loop
      playsInline
      preload={near ? "auto" : "none"}
      aria-hidden
      onCanPlay={() => setReady(true)}
      className={`h-full w-full object-cover transition-opacity duration-700 ease-out ${
        ready ? "opacity-100" : "opacity-0"
      } ${className}`}
    />
  );
}
