import Link from "next/link";
import Image from "next/image";
import { SITE } from "@/lib/config";

/**
 * Logotipo de NutriPointMarket: personaje (mascota del logo) + tipografía.
 * `variant` adapta los colores del texto para fondos oscuros (azul) o claros.
 */
export function Logo({
  variant = "dark",
  className = "",
}: {
  variant?: "dark" | "light";
  className?: string;
}) {
  const baseColor = variant === "dark" ? "text-white" : "text-primary";

  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2 ${className}`}
      aria-label={`${SITE.name} inicio`}
    >
      <Image
        src="/personaje.png"
        alt=""
        width={44}
        height={44}
        priority
        className="h-9 w-9 shrink-0 object-contain transition-transform group-hover:scale-105 sm:h-10 sm:w-10"
      />
      <span
        className={`font-display text-lg font-extrabold leading-none tracking-tight sm:text-xl ${baseColor}`}
      >
        Nutri<span className="text-accent">Point</span>
        <span className={variant === "dark" ? "text-white/85" : "text-muted"}>
          Market
        </span>
      </span>
    </Link>
  );
}
