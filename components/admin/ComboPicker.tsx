"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { CheckIcon, CloseIcon, MinusIcon, PlusIcon, SearchIcon } from "@/components/Icons";

/** Un renglón del combo: producto, cantidad y (opcional) sabor fijo. Sin `v`, el cliente elige. */
export type FilaCombo = { n: string; q: string; v?: string };
const sinAcento = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
/** Valor del selector para "lo elige el cliente". */
const ELIGE = "__elige__";

/**
 * Elegir los productos de un combo: lista con foto y buscador para tildarlos,
 * cantidad de cada uno y, si el producto tiene sabores, el sabor de ese renglón
 * (o "lo elige el cliente"). Un mismo producto puede ir varias veces con
 * distinto sabor (ej. "1 Keto Chocolate + 1 Keto Vainilla").
 */
export function ComboPicker({ value, onChange, productos, abiertoAlInicio = false }: {
  value: FilaCombo[];
  onChange: (f: FilaCombo[]) => void;
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
  const cambiar = (i: number, patch: Partial<FilaCombo>) =>
    onChange(elegidos.map((f, k) => (k === i ? { ...f, ...patch } : f)));
  const cantidad = (i: number, d: number) =>
    cambiar(i, { q: String(Math.max(1, (Number(elegidos[i].q) || 1) + d)) });
  const quitar = (i: number) => onChange(elegidos.filter((_, k) => k !== i));
  // Otro renglón del mismo producto, con el primer sabor que todavía no esté usado.
  const otroSabor = (i: number) => {
    const f = elegidos[i];
    const sabores = porNombre.get(f.n)?.flavors ?? [];
    const usados = new Set(elegidos.filter((x) => x.n === f.n).map((x) => x.v));
    const libre = sabores.find((s) => !usados.has(s)) ?? sabores[0];
    const nuevo: FilaCombo = { n: f.n, q: "1", ...(libre ? { v: libre } : {}) };
    onChange([...elegidos.slice(0, i + 1), nuevo, ...elegidos.slice(i + 1)]);
  };

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
          {elegidos.map((f, i) => {
            const p = porNombre.get(f.n);
            const sabores = p?.flavors ?? [];
            return (
              <li key={`${f.n}|${f.v ?? ""}|${i}`} className="rounded-xl border border-line bg-white p-2">
                <div className="flex items-center gap-2">
                  <Foto p={p} />
                  <div className="min-w-0 flex-1">
                    {p?.brand && <p className="truncate text-[10px] font-bold uppercase tracking-wide text-primary">{p.brand}</p>}
                    <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{f.n}</p>
                  </div>
                  <div className="flex h-9 items-center rounded-full border border-line">
                    <button type="button" onClick={() => cantidad(i, -1)} aria-label={`Una unidad menos de ${f.n}`} className="grid h-9 w-8 place-items-center text-primary"><MinusIcon className="h-3.5 w-3.5" /></button>
                    <span className="w-6 text-center text-sm font-bold text-ink">{f.q}</span>
                    <button type="button" onClick={() => cantidad(i, 1)} aria-label={`Una unidad más de ${f.n}`} className="grid h-9 w-8 place-items-center text-primary"><PlusIcon className="h-3.5 w-3.5" /></button>
                  </div>
                  <button type="button" onClick={() => quitar(i)} aria-label={`Quitar ${f.n} del combo`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted hover:bg-page-soft hover:text-sale">
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
                {sabores.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-2 pl-12">
                    <label className="flex min-w-0 flex-1 items-center gap-2 text-[11px] font-semibold text-muted">
                      Sabor
                      <select
                        value={f.v ?? ELIGE}
                        onChange={(e) => cambiar(i, e.target.value === ELIGE ? { v: undefined } : { v: e.target.value })}
                        aria-label={`Sabor de ${f.n}`}
                        className="input h-8 min-w-0 flex-1 px-2 text-xs"
                      >
                        <option value={ELIGE}>Lo elige el cliente</option>
                        {sabores.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <button type="button" onClick={() => otroSabor(i)} className="shrink-0 text-[11px] font-bold text-primary hover:underline">
                      + otro sabor
                    </button>
                  </div>
                )}
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
