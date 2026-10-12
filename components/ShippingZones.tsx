"use client";

import { useId, useState } from "react";
import { ZONAS_ENVIO, formatARS, type ZonaEnvio } from "@/lib/envios";
import { CheckIcon } from "@/components/Icons";

/**
 * Cuadro de zonas de envío: 4 tarjetas (una por zona) con precio y color,
 * que al tocarlas despliegan sus partidos; nota del interior y mapa plegable.
 * `selectedId` permite sincronizarlo con el partido elegido en el checkout.
 */
export function ShippingZones({
  selectedId,
  onSelect,
  className = "",
}: {
  selectedId?: ZonaEnvio["id"] | null;
  onSelect?: (zona: ZonaEnvio) => void;
  className?: string;
}) {
  const [open, setOpen] = useState<ZonaEnvio["id"] | null>(selectedId ?? null);
  const [mapa, setMapa] = useState(false);
  const uid = useId();
  const active = selectedId ?? open;

  const toggle = (z: ZonaEnvio) => {
    setOpen((o) => (o === z.id ? null : z.id));
    onSelect?.(z);
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {ZONAS_ENVIO.map((z) => {
          const sel = active === z.id;
          return (
            <button
              key={z.id}
              type="button"
              aria-pressed={sel}
              aria-expanded={open === z.id}
              aria-controls={`${uid}-${z.id}`}
              onClick={() => toggle(z)}
              className={`group relative overflow-hidden rounded-2xl border-2 p-3 text-left shadow-card transition-[transform,box-shadow,border-color] duration-200 ease-enter hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-4 ${
                sel ? "border-primary" : "border-transparent"
              }`}
              style={{ background: z.color, color: z.texto }}
            >
              <span className="block text-[11px] font-bold uppercase tracking-wide opacity-80 sm:text-xs">
                Zona de envío
              </span>
              <span className="block font-display text-base font-black leading-tight sm:text-lg">{z.nombre}</span>
              <span className="mt-1 block font-display text-xl font-black sm:text-2xl">{formatARS(z.precio)}</span>
              <span
                aria-hidden
                className={`absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full bg-white text-primary shadow-soft transition-transform duration-200 ease-enter motion-reduce:transition-none ${
                  sel ? "scale-100" : "scale-0"
                }`}
              >
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
            </button>
          );
        })}
      </div>

      {/* Partidos de la zona abierta */}
      {ZONAS_ENVIO.map((z) => (
        <div
          key={z.id}
          id={`${uid}-${z.id}`}
          hidden={open !== z.id}
          className="mt-3 rounded-xl border border-line bg-white p-3 text-sm animate-section-in motion-reduce:animate-none"
        >
          <p className="mb-1.5 flex items-center gap-2 font-semibold text-ink">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: z.color }} aria-hidden />
            {z.nombre} · {formatARS(z.precio)}
          </p>
          <ul className="grid gap-x-4 gap-y-1 text-muted sm:grid-cols-2">
            {z.partidos.map((p) => (
              <li key={p} className="flex gap-1.5">
                <span aria-hidden className="text-accent">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted sm:text-sm">📦 Interior del país: envío por Vía Cargo</p>
        <button
          type="button"
          aria-expanded={mapa}
          onClick={() => setMapa((m) => !m)}
          className="btn btn-outline btn-md w-full sm:w-auto"
        >
          {mapa ? "Ocultar mapa" : "Ver mapa de zonas"}
        </button>
      </div>

      {mapa && (
        <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-white animate-section-in motion-reduce:animate-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/envios/mapa-zonas-envio.webp"
            alt="Mapa de zonas de envío de Capital y Gran Buenos Aires"
            width={2400}
            height={2160}
            loading="lazy"
            decoding="async"
            className="h-auto w-full"
          />
        </div>
      )}
    </div>
  );
}
