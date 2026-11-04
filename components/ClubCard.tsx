"use client";

import type { ClubEstado } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { CheckIcon } from "@/components/Icons";

/** Regalo (el último casillero de la tarjeta). */
function GiftIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M20 12v9H4v-9" />
      <path d="M2 7h20v5H2z" />
      <path d="M12 21V7" />
      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function ordinal(n: number): string {
  return `${n}ª`;
}

/**
 * Tarjeta del Club de sellos: una compra pagada = un sello; en la compra número
 * `meta` el premio (monto fijo) se descuenta solo en el checkout.
 *
 * - "card": tarjeta completa (Mi cuenta).
 * - "compact": franja chica para el checkout.
 * Solo se muestra si el club está activo (premio > 0).
 */
export function ClubCard({ estado, variant = "card" }: { estado: ClubEstado; variant?: "card" | "compact" }) {
  if (!estado.activo || estado.premio <= 0) return null;
  const { meta, premio, premioDisponible } = estado;
  // Casilleros: meta − 1 sellos + 1 regalo. Nunca se muestran más sellos que casilleros.
  const sellos = Math.min(estado.sellos, meta - 1);
  const faltan = Math.max(0, meta - 1 - sellos);
  const casillas = Array.from({ length: meta }, (_, i) => i);

  const titulo = premioDisponible
    ? "¡Tu premio está listo!"
    : sellos === 0
      ? `Sumá sellos y llevate ${formatPrice(premio)} de descuento`
      : `Llevás ${sellos} de ${meta - 1} sellos`;
  const detalle = premioDisponible
    ? `${formatPrice(premio)} de descuento en tu próxima compra. Se aplica solo al confirmar el pedido.`
    : `Cada compra pagada suma un sello. En la ${ordinal(meta)} compra tenés ${formatPrice(premio)} de descuento.${
        sellos > 0 ? ` Te ${faltan === 1 ? "falta" : "faltan"} ${faltan}.` : ""
      }`;

  if (variant === "compact") {
    return (
      <div
        className="flex items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5"
        role="status"
        aria-label={`Club Suple: ${titulo}`}
      >
        <ul className="flex shrink-0 items-center gap-1" aria-hidden>
          {casillas.map((i) => {
            const esRegalo = i === meta - 1;
            const lleno = !esRegalo && i < sellos;
            return (
              <li
                key={i}
                className={`grid h-5 w-5 place-items-center rounded-full border ${
                  esRegalo
                    ? premioDisponible
                      ? "border-accent bg-accent text-primary"
                      : "border-primary/30 text-primary/50"
                    : lleno
                      ? "border-primary bg-primary text-accent"
                      : "border-primary/25 bg-white"
                }`}
              >
                {esRegalo ? <GiftIcon className="h-3 w-3" /> : lleno ? <CheckIcon className="h-3 w-3" /> : null}
              </li>
            );
          })}
        </ul>
        <p className="min-w-0 text-xs leading-snug text-ink">
          <span className="font-bold text-primary">Club Suple · </span>
          {premioDisponible
            ? `¡Premio listo! ${formatPrice(premio)} de descuento en este pedido.`
            : sellos === 0
              ? `Con esta compra sumás tu primer sello. En la ${ordinal(meta)} tenés ${formatPrice(premio)} de descuento.`
              : `Llevás ${sellos} de ${meta - 1} sellos: con esta compra sumás el ${sellos + 1}º.`}
        </p>
      </div>
    );
  }

  return (
    <article
      className="relative overflow-hidden rounded-3xl bg-primary p-6 text-white shadow-card sm:p-8"
      aria-label={`Club Suple: ${titulo}`}
    >
      {/* Luz suave de fondo */}
      <span aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">Club Suple</p>
          <h3 className="mt-1 font-display text-xl font-extrabold leading-tight sm:text-2xl">{titulo}</h3>
        </div>
        <p className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tabular-nums">
          {sellos}/{meta - 1} sellos
        </p>
      </div>

      <ul className="relative mt-6 grid grid-cols-6 gap-2 sm:gap-3" aria-hidden>
        {casillas.map((i) => {
          const esRegalo = i === meta - 1;
          const lleno = !esRegalo && i < sellos;
          return (
            <li key={i} className="flex justify-center">
              <span
                className={`grid aspect-square w-full max-w-[56px] place-items-center rounded-full border-2 transition-colors ${
                  esRegalo
                    ? premioDisponible
                      ? "animate-badge-pop border-accent bg-accent text-primary motion-reduce:animate-none"
                      : "border-dashed border-white/40 text-white/60"
                    : lleno
                      ? "animate-badge-pop border-accent bg-accent text-primary motion-reduce:animate-none"
                      : "border-dashed border-white/35 text-white/30"
                }`}
                style={lleno || (esRegalo && premioDisponible) ? { animationDelay: `${i * 70}ms` } : undefined}
              >
                {esRegalo ? (
                  <GiftIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                ) : lleno ? (
                  <CheckIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="relative mt-5 text-sm leading-relaxed text-white/85">{detalle}</p>
      {estado.premios > 0 && (
        <p className="relative mt-2 text-xs text-white/60">
          Ya usaste {estado.premios} {estado.premios === 1 ? "premio" : "premios"}. ¡Gracias por elegirnos!
        </p>
      )}
    </article>
  );
}
