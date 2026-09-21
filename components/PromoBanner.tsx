import Link from "next/link";
import { ArrowRightIcon } from "./Icons";

/**
 * Banner promocional intermedio. Reutilizable y configurable.
 * `variant` cambia el color de fondo. Reemplazable por imagen de Canva.
 */
export function PromoBanner({
  title,
  text,
  ctaLabel,
  ctaHref,
  variant = "accent",
}: {
  title: string;
  text: string;
  ctaLabel: string;
  ctaHref: string;
  variant?: "accent" | "primary";
}) {
  const isAccent = variant === "accent";
  return (
    <div
      className={`relative flex flex-col items-start gap-4 overflow-hidden rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8 ${
        isAccent ? "bg-accent text-primary" : "bg-primary text-white"
      }`}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full opacity-20"
        style={{ background: isAccent ? "rgb(var(--color-primary))" : "rgb(var(--color-accent))" }}
        aria-hidden
      />
      <div className="relative max-w-lg">
        <h3 className="font-display text-xl font-extrabold sm:text-2xl">{title}</h3>
        <p className={`mt-1.5 text-sm ${isAccent ? "text-primary/80" : "text-white/80"}`}>
          {text}
        </p>
      </div>
      <Link
        href={ctaHref}
        className={`btn btn-md relative shrink-0 ${
          isAccent
            ? "bg-primary text-white hover:brightness-110"
            : "bg-accent text-primary hover:brightness-105"
        }`}
      >
        {ctaLabel} <ArrowRightIcon className="h-4 w-4" />
      </Link>
    </div>
  );
}

/** Dos banners lado a lado (combos + envíos). */
export function PromoBannerRow() {
  return (
    <section className="container-page py-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <PromoBanner
          variant="accent"
          title="Combos NutriPoint"
          text="Combiná proteína + creatina y obtené un mejor precio."
          ctaLabel="Ver combos"
          ctaHref="/productos?categoria=combos"
        />
        <PromoBanner
          variant="primary"
          title="Envíos a todo el país"
          text="Recibí tus suplementos estés donde estés, con seguimiento."
          ctaLabel="Cómo comprar"
          ctaHref="/contacto#como-comprar"
        />
      </div>
    </section>
  );
}
