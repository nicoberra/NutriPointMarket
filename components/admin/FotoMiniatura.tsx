"use client";

import { useEffect, useState } from "react";
import { rawAsset } from "@/lib/api";

/**
 * Miniatura de una foto de producto en el CRM.
 *
 * Una foto recién subida ya está en GitHub, pero en el dominio de la web recién
 * aparece cuando termina el deploy (2-4 minutos). Para que no se vea rota:
 * 1) se intenta la ruta local (/productos/x.jpg), 2) si falla, la misma foto
 * directo desde GitHub, 3) si tampoco, se muestra "Procesando…" y se reintenta
 * sola cada 20 segundos hasta que cargue.
 */
export function FotoMiniatura({ src, className = "" }: { src: string; className?: string }) {
  const [intento, setIntento] = useState(0); // 0 = local · 1 = GitHub · 2+ = esperando
  useEffect(() => {
    setIntento(0);
  }, [src]);
  useEffect(() => {
    if (intento < 2) return;
    const t = setTimeout(() => setIntento(0), 20000);
    return () => clearTimeout(t);
  }, [intento]);

  if (intento >= 2) {
    return (
      <span
        role="img"
        aria-label="Foto procesándose"
        title="La foto se está publicando; aparece en unos minutos"
        className={`grid place-items-center bg-page-soft text-center text-[9px] font-semibold leading-tight text-muted ${className}`}
      >
        Procesando…
      </span>
    );
  }
  const url = intento === 0 ? src : `${rawAsset(src)}${rawAsset(src).includes("?") ? "&" : "?"}r=${Date.now()}`;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className={className} onError={() => setIntento((i) => i + 1)} />
  );
}
