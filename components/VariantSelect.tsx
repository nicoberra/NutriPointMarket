"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Desplegable de variantes con estilo propio (el <select> nativo abre una
 * lista del sistema, cuadrada, que no se puede estilizar).
 * La lista se abre HACIA ARRIBA sobre la propia tarjeta: así queda siempre
 * dentro de la tarjeta y no la recorta ningún carrusel/scroll.
 */
export function VariantSelect({
  value,
  options,
  onChange,
  disabledOptions = [],
  label,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabledOptions?: string[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Cerrar al tocar afuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${value}`}
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-full items-center justify-between rounded-full border bg-page-soft pl-4 pr-3.5 text-xs font-semibold text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-accent/30 ${
          open ? "border-accent" : "border-line hover:border-accent"
        }`}
      >
        <span className="truncate">{value}</span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className={`ml-2 h-4 w-4 shrink-0 text-primary transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8l4 4 4-4" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute bottom-[calc(100%+6px)] left-0 right-0 z-30 max-h-64 overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-card-hover"
        >
          {options.map((o) => {
            const dis = disabledOptions.includes(o);
            const sel = o === value;
            return (
              <li key={o} role="option" aria-selected={sel}>
                <button
                  type="button"
                  disabled={dis}
                  onClick={() => {
                    onChange(o);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors ${
                    dis
                      ? "cursor-not-allowed text-muted line-through opacity-50"
                      : sel
                        ? "bg-accent-soft text-primary"
                        : "text-ink hover:bg-page-soft"
                  }`}
                >
                  <span className="truncate">
                    {o}
                    {dis ? " · sin stock" : ""}
                  </span>
                  {sel && (
                    <svg
                      aria-hidden
                      viewBox="0 0 20 20"
                      className="h-4 w-4 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 10.5l4 4 8-8" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
