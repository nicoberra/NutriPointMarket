import Link from "next/link";
import { SITE } from "@/lib/config";

/**
 * Logotipo tipográfico provisorio de NutriPointMarket.
 * Cuando exista un logo definitivo, reemplazar el contenido por un <Image />.
 * `variant` adapta los colores para fondos claros u oscuros.
 */
export function Logo({
  variant = "dark",
  className = "",
}: {
  variant?: "dark" | "light";
  className?: string;
}) {
  // "dark" = pensado para header oscuro (texto claro)
  const baseColor = variant === "dark" ? "text-white" : "text-primary";

  return (
    <Link
      href="/"
      className={`group inline-flex items-center gap-2.5 ${className}`}
      aria-label={`${SITE.name} inicio`}
    >
      <span
        className="grid h-8 w-8 place-items-center rounded-lg bg-accent font-display text-base font-black text-primary shadow-soft transition-transform group-hover:scale-105 sm:h-9 sm:w-9 sm:text-lg"
        aria-hidden
      >
        N
      </span>
      <span className={`font-display text-lg font-extrabold leading-none tracking-tight sm:text-xl ${baseColor}`}>
        Nutri<span className="text-accent">Point</span>
        <span className={variant === "dark" ? "text-white/85" : "text-muted"}>
          Market
        </span>
      </span>
    </Link>
  );
}
