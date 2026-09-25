import Link from "next/link";
import { SITE, ASSET_PREFIX } from "@/lib/config";

/**
 * Logotipo de NutriPointMarket: personaje (mascota del logo) + tipografía.
 * `variant` adapta los colores del texto para fondos oscuros (azul) o claros.
 */
export function Logo({
  variant = "dark",
  className = "",
  wordmarkClassName = "",
}: {
  variant?: "dark" | "light";
  className?: string;
  /** Clases extra para el texto del logo (ej. ocultarlo en mobile) */
  wordmarkClassName?: string;
}) {
  const baseColor = variant === "dark" ? "text-white" : "text-primary";

  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2 ${className}`}
      aria-label={`${SITE.name} inicio`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${ASSET_PREFIX}/personaje.png`}
        alt=""
        width={44}
        height={44}
        className="h-9 w-9 shrink-0 object-contain transition-transform group-hover:scale-105 sm:h-10 sm:w-10"
      />
      <span
        className={`font-display text-lg font-extrabold leading-none tracking-tight sm:text-xl ${baseColor} ${wordmarkClassName}`}
      >
        Suple<span className="text-accent"> Market</span>
      </span>
    </Link>
  );
}
