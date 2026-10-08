"use client";

import { forwardRef, useState, type ImgHTMLAttributes } from "react";

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
  const [fallback, setFallback] = useState(false);
  const srcSet = fallback ? null : webpSrcSet(src);

  if (!srcSet) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img ref={ref} src={src} alt={alt} onError={onError} {...rest} />;
  }
  return (
    <picture className="contents">
      <source type="image/webp" srcSet={srcSet} sizes={sizes} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={src}
        alt={alt}
        sizes={sizes}
        onError={(e) => {
          setFallback(true);
          onError?.(e);
        }}
        {...rest}
      />
    </picture>
  );
});
