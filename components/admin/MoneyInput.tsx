"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Campo de plata del CRM: "$" adelante, miles con punto y decimales con coma
 * (1.000 · 10.000 · 19.189,50). Se reformatea mientras escribís sin que el
 * cursor salte, y devuelve el número limpio (o "" si está vacío).
 */

/** 19189.5 → "19.189,5" */
export function formatoPlata(n: number | "", decimales = 0): string {
  if (n === "" || !Number.isFinite(n)) return "";
  return n.toLocaleString("es-AR", { maximumFractionDigits: decimales });
}

/** "19.189,50" → 19189.5 · "" → "" */
function leer(txt: string): number | "" {
  const limpio = txt.replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "");
  if (!limpio || limpio === ".") return "";
  const n = Number(limpio);
  return Number.isFinite(n) ? n : "";
}

/** Deja dígitos y una coma, y pone los puntos de miles. */
function reformatear(txt: string, decimales: number): string {
  const s = txt.replace(/[^\d,]/g, "");
  const i = decimales > 0 ? s.indexOf(",") : -1;
  const ent = (i >= 0 ? s.slice(0, i) : s.replace(/,/g, "")).replace(/^0+(?=\d)/, "");
  const conPuntos = ent.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (i < 0) return conPuntos;
  return `${conPuntos || "0"},${s.slice(i + 1).replace(/,/g, "").slice(0, decimales)}`;
}

export function MoneyInput({
  value,
  onChange,
  onBlur,
  decimales = 0,
  conSigno = true,
  signo = "$",
  className = "",
  wrapClassName = "",
  placeholder,
  "aria-label": ariaLabel,
}: {
  value: number | "";
  onChange: (n: number | "") => void;
  onBlur?: () => void;
  /** Decimales permitidos (costos: 2; precios: 0). */
  decimales?: number;
  /** false = sin el "$" (ej. descuento en %). */
  conSigno?: boolean;
  /** "$" o "US$". */
  signo?: string;
  className?: string;
  /** Clases del contenedor (ej. flex-1 dentro de una fila). */
  wrapClassName?: string;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [txt, setTxt] = useState(() => formatoPlata(value, decimales));
  const enFoco = useRef(false);
  const cursor = useRef<number | null>(null);

  // Si el valor cambia desde afuera (otro campo, datos nuevos), se refleja acá.
  useEffect(() => {
    if (!enFoco.current) setTxt(formatoPlata(value, decimales));
  }, [value, decimales]);

  // Deja el cursor donde estaba después de poner o sacar puntos.
  useLayoutEffect(() => {
    if (cursor.current != null && ref.current && document.activeElement === ref.current) {
      ref.current.setSelectionRange(cursor.current, cursor.current);
    }
    cursor.current = null;
  });

  return (
    <div className={`relative ${wrapClassName}`}>
      {conSigno && (
        <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-muted">
          {signo}
        </span>
      )}
      <input
        ref={ref}
        type="text"
        inputMode={decimales > 0 ? "decimal" : "numeric"}
        autoComplete="off"
        value={txt}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onFocus={() => {
          enFoco.current = true;
        }}
        onChange={(e) => {
          let raw = e.target.value;
          const pos = e.target.selectionStart ?? raw.length;
          // El punto del teclado numérico, en un campo con decimales, es la coma.
          if (decimales > 0 && (e.nativeEvent as InputEvent).data === "." && raw[pos - 1] === ".") {
            raw = `${raw.slice(0, pos - 1)},${raw.slice(pos)}`;
          }
          const antes = raw.slice(0, pos).replace(/[^\d,]/g, "").length;
          const nuevo = reformatear(raw, decimales);
          let c = 0;
          let i = 0;
          while (i < nuevo.length && c < antes) {
            if (/[\d,]/.test(nuevo[i])) c++;
            i++;
          }
          cursor.current = i;
          setTxt(nuevo);
          onChange(leer(nuevo));
        }}
        onBlur={() => {
          enFoco.current = false;
          setTxt(formatoPlata(leer(txt), decimales));
          onBlur?.();
        }}
        className={`${className} ${conSigno ? (signo.length > 1 ? "!pl-12" : "!pl-7") : ""}`}
      />
    </div>
  );
}
