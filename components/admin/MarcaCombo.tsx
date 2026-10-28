"use client";

import { useId, useMemo, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/Icons";

const sinAcento = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/**
 * Campo de marca: despliega las marcas que ya existen (filtrando mientras se
 * escribe) y deja escribir una nueva. La lista sale de los productos cargados,
 * así una marca nueva aparece sola apenas se guarda un producto con ella.
 */
export function MarcaCombo({ value, onChange, marcas }: { value: string; onChange: (v: string) => void; marcas: string[] }) {
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);
  const cerrar = useRef<ReturnType<typeof setTimeout> | null>(null);

  const q = sinAcento(value);
  const opciones = useMemo(() => {
    const lista = q ? marcas.filter((m) => sinAcento(m).includes(q)) : marcas;
    const existe = marcas.some((m) => sinAcento(m) === q);
    return { lista, nueva: value.trim() && !existe ? value.trim() : "" };
  }, [marcas, q, value]);
  const total = opciones.lista.length + (opciones.nueva ? 1 : 0);

  const elegir = (m: string) => {
    onChange(m);
    setAbierto(false);
    setActivo(-1);
  };
  // Si escribió una marca que ya existe con otras mayúsculas, queda la de la lista (sin duplicados).
  const normalizar = () => {
    const igual = marcas.find((m) => sinAcento(m) === q);
    if (igual && igual !== value) onChange(igual);
  };

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setAbierto(true); setActivo(-1); }}
        onFocus={() => setAbierto(true)}
        onBlur={() => { cerrar.current = setTimeout(() => { setAbierto(false); normalizar(); }, 120); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setAbierto(true); setActivo((a) => Math.min(total - 1, a + 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((a) => Math.max(0, a - 1)); }
          else if (e.key === "Escape") setAbierto(false);
          else if (e.key === "Enter" && abierto && activo >= 0) {
            e.preventDefault();
            elegir(activo < opciones.lista.length ? opciones.lista[activo] : opciones.nueva);
          }
        }}
        role="combobox"
        aria-expanded={abierto && total > 0}
        aria-controls={`${id}-lista`}
        aria-autocomplete="list"
        aria-activedescendant={activo >= 0 ? `${id}-op-${activo}` : undefined}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="words"
        spellCheck={false}
        className="input h-11 pr-10 text-base"
        placeholder="Elegí o escribí"
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label="Ver marcas"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setAbierto((a) => !a)}
        className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-page-soft"
      >
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>
      {abierto && total > 0 && (
        <ul
          id={`${id}-lista`}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 animate-fade-in overflow-y-auto rounded-xl border border-line bg-white p-1 shadow-card motion-reduce:animate-none"
        >
          {opciones.lista.map((m, i) => (
            <li
              key={m}
              id={`${id}-op-${i}`}
              role="option"
              aria-selected={activo === i}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => elegir(m)}
              className={`cursor-pointer rounded-lg px-3 py-2.5 text-sm font-semibold text-ink ${activo === i ? "bg-accent-soft" : "hover:bg-page-soft"}`}
            >
              {m}
            </li>
          ))}
          {opciones.nueva && (
            <li
              id={`${id}-op-${opciones.lista.length}`}
              role="option"
              aria-selected={activo === opciones.lista.length}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => elegir(opciones.nueva)}
              className={`cursor-pointer rounded-lg border-t border-line px-3 py-2.5 text-sm font-bold text-primary ${activo === opciones.lista.length ? "bg-accent-soft" : "hover:bg-page-soft"}`}
            >
              ➕ Marca nueva: «{opciones.nueva}»
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
