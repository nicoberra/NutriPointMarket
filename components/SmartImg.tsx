"use client";

import { forwardRef, useCallback, useEffect, useRef, useState, type ImgHTMLAttributes } from "react";
import { rawAsset } from "@/lib/api";

/**
 * <img> que sirve la versión WebP optimizada (generada en el build por
 * scripts/optimize-images.mjs, en /_opt/) con el tamaño justo para cada pantalla.
 * - Si la foto no tiene versión WebP (URL externa, o recién subida desde el CRM
 *   antes de que termine el deploy), usa la original: nunca queda una imagen rota.
 * - El <picture> usa "display: contents", así no altera el layout de la tarjeta.
 */
const WIDTHS = [400, 800, 1600];
const OPTIMIZABLE = /^\/((?:productos\/)?[^?#]+)\.(jpe?g|png)$/i;

export function webpSrcSet(src: string | undefined): string | null {
  const m = src ? src.match(OPTIMIZABLE) : null;
  if (!m) return null;
  return WIDTHS.map((w) => `/_opt/${m[1]}-${w}.webp ${w}w`).join(", ");
}

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  src?: string;
  /** Ancho con que se ve la imagen (atributo sizes). Ej: "(max-width: 640px) 50vw, 240px" */
  sizes?: string;
};

export const SmartImg = forwardRef<HTMLImageElement, Props>(function SmartImg(
  { src, sizes, onError, alt = "", ...rest },
  ref,
) {
  // 0 = webp + original · 1 = original sin webp · 2 = la misma foto desde GitHub
  // (una foto recién subida existe en el repo antes de que termine el deploy del sitio).
  const [nivel, setNivel] = useState(0);
  const srcSet = nivel > 0 ? null : webpSrcSet(src);
  // Si la imagen ya falló antes de que React se active (HTML estático), el evento
  // onError se pierde: al montar se revisa si quedó rota y se pasa al siguiente nivel.
  const propio = useRef<HTMLImageElement | null>(null);
  const setRefs = useCallback(
    (el: HTMLImageElement | null) => {
      propio.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );
  useEffect(() => {
    const el = propio.current;
    if (el && el.complete && el.naturalWidth === 0 && el.getAttribute("src")) {
      setNivel((n) => (n === 0 ? 1 : n === 1 ? 2 : n));
    }
  }, [nivel, src]);

  if (!srcSet) {
    const local = String(src ?? "");
    const url = nivel >= 2 && local.startsWith("/") ? rawAsset(local) : src;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={setRefs}
        src={url}
        alt={alt}
        onError={(e) => {
          if (nivel < 2) setNivel(2);
          onError?.(e);
        }}
        {...rest}
      />
    );
  }
  return (
    <picture className="contents">
      <source type="image/webp" srcSet={srcSet} sizes={sizes} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={setRefs}
        src={src}
        alt={alt}
        sizes={sizes}
        onError={(e) => {
          setNivel(1);
          onError?.(e);
        }}
        {...rest}
      />
    </picture>
  );
});
