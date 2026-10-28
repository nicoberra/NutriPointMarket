"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { CheckIcon, CloseIcon, MinusIcon, PlusIcon, SearchIcon } from "@/components/Icons";

type Fila = { n: string; q: string };
const sinAcento = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Elegir los productos de un combo: lista con foto y buscador para tildarlos, y
 * cantidad de cada uno. El sabor lo elige el cliente al comprar.
 */
export function ComboPicker({ value, onChange, productos, abiertoAlInicio = false }: {
  value: Fila[];
  onChange: (f: Fila[]) => void;
  productos: Product[];
  abiertoAlInicio?: boolean;
}) {
  const [abierto, setAbierto] = useState(abiertoAlInicio);
  const [q, setQ] = useState("");
  const elegidos = value.filter((f) => f.n);
  const esta = (n: string) => elegidos.some((f) => f.n === n);
  const porNombre = useMemo(() => new Map(productos.map((p) => [p.name, p])), [productos]);
  const lista = useMemo(() => {
    const t = sinAcento(q.trim());
    return t ? productos.filter((p) => sinAcento(`${p.brand} ${p.name}`).includes(t)) : productos;
  }, [productos, q]);

  const alternar = (n: string) => onChange(esta(n) ? elegidos.filter((f) => f.n !== n) : [...elegidos, { n, q: "1" }]);
  const cantidad = (n: string, d: number) =>
    onChange(elegidos.map((f) => (f.n === n ? { ...f, q: String(Math.max(1, (Number(f.q) || 1) + d)) } : f)));

  const Foto = ({ p }: { p?: Product }) =>
    p?.image ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={p.image} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-line bg-white object-contain" />
    ) : (
      <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line bg-white text-base">📦</span>
    );

  return (
    <div className="space-y-2">
      {elegidos.length > 0 && (
        <ul className="space-y-1.5">
          {elegidos.map((f) => {
            const p = porNombre.get(f.n);
            return (
              <li key={f.n} className="flex items-center gap-2 rounded-xl border border-line bg-white p-2">
                <Foto p={p} />
                <div className="min-w-0 flex-1">
                  {p?.brand && <p className="truncate text-[10px] font-bold uppercase tracking-wide text-primary">{p.brand}</p>}
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{f.n}</p>
                </div>
                <div className="flex h-9 items-center rounded-full border border-line">
                  <button type="button" onClick={() => cantidad(f.n, -1)} aria-label={`Una unidad menos de ${f.n}`} className="grid h-9 w-8 place-items-center text-primary"><MinusIcon className="h-3.5 w-3.5" /></button>
                  <span className="w-6 text-center text-sm font-bold text-ink">{f.q}</span>
                  <button type="button" onClick={() => cantidad(f.n, 1)} aria-label={`Una unidad más de ${f.n}`} className="grid h-9 w-8 place-items-center text-primary"><PlusIcon className="h-3.5 w-3.5" /></button>
                </div>
                <button type="button" onClick={() => alternar(f.n)} aria-label={`Quitar ${f.n} del combo`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-page-soft hover:text-sale">
                  <CloseIcon className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-primary/30 bg-white py-2.5 text-sm font-bold text-primary transition hover:border-primary/60"
      >
        {abierto ? "Listo, cerrar la lista" : elegidos.length ? "+ Agregar más productos" : "+ Elegir productos del combo"}
      </button>

      {abierto && (
        <div className="animate-fade-in rounded-xl border border-line bg-white p-2 motion-reduce:animate-none">
          <label className="relative mb-2 block">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto o marca" aria-label="Buscar producto para el combo" className="input h-10 pl-9 text-sm" />
          </label>
          <ul className="max-h-72 space-y-1 overflow-y-auto" role="listbox" aria-multiselectable="true" aria-label="Productos para el combo">
            {lista.map((p) => {
              const si = esta(p.name);
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={si}
                    onClick={() => alternar(p.name)}
                    className={`flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors ${si ? "bg-accent-soft" : "hover:bg-page-soft"}`}
                  >
                    <Foto p={p} />
                    <span className="min-w-0 flex-1">
                      {p.brand && <span className="block truncate text-[10px] font-bold uppercase tracking-wide text-primary">{p.brand}</span>}
                      <span className="line-clamp-2 block text-sm font-semibold leading-snug text-ink">{p.name}</span>
                    </span>
                    <span aria-hidden className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${si ? "border-primary bg-primary text-white" : "border-line bg-white"}`}>
                      {si && <CheckIcon className="h-4 w-4" />}
                    </span>
                  </button>
                </li>
              );
            })}
            {!lista.length && <li className="p-3 text-center text-sm text-muted">No hay productos con ese nombre.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
