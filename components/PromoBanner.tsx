import Link from "next/link";
import { ArrowRightIcon } from "./Icons";
import { Reveal } from "./motion/Reveal";

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
      className={`relative flex flex-col items-start gap-5 overflow-hidden rounded-2xl p-7 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-9 ${
        isAccent ? "bg-accent text-primary" : "bg-primary text-white"
      }`}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full opacity-25"
        style={{ background: isAccent ? "rgb(var(--color-primary))" : "rgb(var(--color-accent))" }}
        aria-hidden
      />
      <div className="relative max-w-lg">
        <h3 className="font-display text-2xl font-black leading-tight sm:text-3xl">{title}</h3>
        <p className={`mt-2 text-sm sm:text-base ${isAccent ? "text-primary/80" : "text-white/85"}`}>
          {text}
        </p>
      </div>
      <Link
        href={ctaHref}
        className={`btn btn-md relative shrink-0 font-bold ${
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
      <Reveal className="grid gap-4 lg:grid-cols-2" y={20} stagger={0.12}>
        <PromoBanner
          variant="accent"
          title="Combos Suple Market"
          text="Combiná proteína + creatina y obtené un mejor precio."
          ctaLabel="Ver combos"
          ctaHref="/productos?categoria=combos"
        />
        <PromoBanner
          variant="primary"
          title="Descuento por transferencia"
          text="Pagando por transferencia bancaria tenés 10% de descuento."
          ctaLabel="Cómo comprar"
          ctaHref="/contacto#pagos"
        />
      </Reveal>
    </section>
  );
}
