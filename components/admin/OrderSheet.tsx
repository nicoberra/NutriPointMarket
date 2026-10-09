"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { useProducts } from "@/context/ProductsContext";
import { formatPrice } from "@/lib/format";
import { CloseIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import { useDollar, costToPesos } from "./AdminProducts";

type Row = Record<string, string>;
type Pago = "Transferencia" | "Efectivo" | "Mercado Pago";
type Line = { pid: string; variant: string; qty: number };

/**
 * Pedido cargado a mano desde el CRM: se eligen productos del catálogo y el
 * precio sale solo según cómo paga (transferencia y efectivo = precio con
 * transferencia; Mercado Pago = precio publicado). Guarda detalle, items (para
 * descontar stock al aprobar), monto y costo.
 */
export function OrderSheet({
  initial,
  saving,
  onClose,
  onSave,
}: {
  initial?: { cliente?: string; telefono?: string };
  saving: boolean;
  onClose: () => void;
  onSave: (r: Row) => void;
}) {
  const { products } = useProducts();
  const dollar = useDollar();
  const [cliente, setCliente] = useState(initial?.cliente ?? "");
  const [telefono, setTelefono] = useState(initial?.telefono ?? "");
  const [pago, setPago] = useState<Pago>("Transferencia");
  const [lines, setLines] = useState<Line[]>([]);
  const [montoEnvio, setMontoEnvio] = useState<string>("");
  const [envio, setEnvio] = useState("");
  const [notas, setNotas] = useState("");

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const sorted = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, "es")),
    [products],
  );

  const unitPrice = (p: Product) => (pago === "Mercado Pago" ? p.price : (p.basePrice ?? p.price));
  const unitCost = (p: Product): number => {
    if (p.combo && p.combo.length) {
      return p.combo.reduce((acc, c) => {
        const comp = products.find((x) => x.name === c.n);
        return acc + (comp ? costToPesos(comp.cost ?? 0, comp.costCurrency ?? "ARS", dollar) * c.q : 0);
      }, 0);
    }
    return costToPesos(p.cost ?? 0, p.costCurrency ?? "ARS", dollar);
  };

  const subtotal = lines.reduce((acc, l) => {
    const p = byId.get(l.pid);
    return acc + (p ? unitPrice(p) * l.qty : 0);
  }, 0);
  const costo = lines.reduce((acc, l) => {
    const p = byId.get(l.pid);
    return acc + (p ? unitCost(p) * l.qty : 0);
  }, 0);
  const envioNum = Number(montoEnvio) || 0;
  const total = subtotal + envioNum;

  const addLine = () => {
    const first = sorted.find((p) => !lines.some((l) => l.pid === p.id)) ?? sorted[0];
    if (!first) return;
    setLines((ls) => [...ls, { pid: first.id, variant: first.flavors[0] ?? "", qty: 1 }]);
  };
  const setLine = (i: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const removeLine = (i: number) => setLines((ls) => ls.filter((_, j) => j !== i));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente.trim() || lines.length === 0) return;
    const items = lines
      .map((l) => {
        const p = byId.get(l.pid);
        return p ? { n: p.name, v: l.variant || "", q: l.qty } : null;
      })
      .filter(Boolean);
    const detalle = lines
      .map((l) => {
        const p = byId.get(l.pid);
        return p ? `${l.qty}x ${p.name}${l.variant ? ` (${l.variant})` : ""}` : "";
      })
      .filter(Boolean)
      .join(" | ");
    onSave({
      cliente: cliente.trim(),
      telefono: telefono.trim(),
      detalle,
      monto: String(Math.round(total)),
      costo: costo > 0 ? String(Math.round(costo)) : "",
      pago,
      envio: envio.trim(),
      montoEnvio: envioNum > 0 ? String(envioNum) : "",
      notas: notas.trim(),
      items: JSON.stringify(items),
      descontado: "no",
    });
  };

  const PAGOS: { v: Pago; hint: string }[] = [
    { v: "Transferencia", hint: "precio con transferencia" },
    { v: "Efectivo", hint: "precio con transferencia" },
    { v: "Mercado Pago", hint: "precio publicado" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 animate-fade-in bg-black/50 motion-reduce:animate-none" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative max-h-[92vh] w-full max-w-md animate-section-in overflow-y-auto rounded-t-2xl bg-page p-5 motion-reduce:animate-none sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="truncate font-display text-lg font-bold text-primary">
            Nuevo pedido{initial?.cliente ? ` · ${initial.cliente}` : ""}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink hover:bg-page-soft"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Cliente */}
          <div className="grid grid-cols-2 gap-2">
            <label className="col-span-2 block">
              <span className="mb-1 block text-xs font-semibold text-ink">
                Cliente <span className="text-sale">*</span>
              </span>
              <input value={cliente} onChange={(e) => setCliente(e.target.value)} required className="input h-11 text-base" />
            </label>
            <label className="col-span-2 block">
              <span className="mb-1 block text-xs font-semibold text-ink">Teléfono</span>
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} type="tel" className="input h-11 text-base" />
            </label>
          </div>

          {/* Forma de pago */}
          <div>
            <span className="mb-1 block text-xs font-semibold text-ink">Forma de pago</span>
            <div className="grid grid-cols-3 gap-2">
              {PAGOS.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setPago(o.v)}
                  className={`rounded-xl border px-2 py-2 text-xs font-bold transition-colors ${
                    pago === o.v ? "border-primary bg-primary text-white" : "border-line bg-white text-ink"
                  }`}
                >
                  {o.v}
                  <span className={`block text-[10px] font-medium ${pago === o.v ? "text-white/70" : "text-muted"}`}>
                    {o.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Productos */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">Productos</span>
              <button type="button" onClick={addLine} className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                <PlusIcon className="h-4 w-4" /> Agregar producto
              </button>
            </div>
            {lines.length === 0 ? (
              <button
                type="button"
                onClick={addLine}
                className="w-full rounded-xl border border-dashed border-line bg-white py-4 text-sm font-semibold text-primary"
              >
                + Elegir el primer producto
              </button>
            ) : (
              <ul className="space-y-2">
                {lines.map((l, i) => {
                  const p = byId.get(l.pid);
                  const flavors = p?.flavors ?? [];
                  return (
                    <li key={i} className="rounded-xl border border-line bg-white p-3">
                      <div className="flex items-start gap-2">
                        <select
                          value={l.pid}
                          onChange={(e) => {
                            const np = byId.get(e.target.value);
                            setLine(i, { pid: e.target.value, variant: np?.flavors[0] ?? "" });
                          }}
                          className="input h-11 min-w-0 flex-1 text-sm"
                        >
                          {sorted.map((op) => (
                            <option key={op.id} value={op.id}>
                              {op.name}
                              {op.inStock === false ? " (sin stock)" : ""}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeLine(i)}
                          aria-label="Quitar producto"
                          className="grid h-11 w-10 shrink-0 place-items-center rounded-lg text-sale hover:bg-sale/10"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        {flavors.length > 0 && (
                          <select
                            value={l.variant}
                            onChange={(e) => setLine(i, { variant: e.target.value })}
                            className="input h-10 min-w-0 flex-1 text-sm"
                          >
                            {flavors.map((fl) => (
                              <option key={fl} value={fl}>
                                {fl}
                              </option>
                            ))}
                          </select>
                        )}
                        <div className="ml-auto flex items-center rounded-lg border border-line">
                          <button
                            type="button"
                            onClick={() => setLine(i, { qty: Math.max(1, l.qty - 1) })}
                            aria-label="Menos"
                            className="h-10 w-9 text-lg font-bold text-primary"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm font-bold">{l.qty}</span>
                          <button
                            type="button"
                            onClick={() => setLine(i, { qty: l.qty + 1 })}
                            aria-label="Más"
                            className="h-10 w-9 text-lg font-bold text-primary"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      {p && (
                        <p className="mt-2 text-right text-sm font-semibold text-ink">
                          {l.qty > 1 && <span className="text-xs font-normal text-muted">{l.qty} × {formatPrice(unitPrice(p))} = </span>}
                          {formatPrice(unitPrice(p) * l.qty)}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Envío */}
          <div className="grid grid-cols-[120px_1fr] gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink">Envío ($)</span>
              <input
                value={montoEnvio}
                onChange={(e) => setMontoEnvio(e.target.value)}
                type="number"
                inputMode="numeric"
                placeholder="0"
                className="input h-11 text-base"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink">Dirección / forma de entrega</span>
              <input value={envio} onChange={(e) => setEnvio(e.target.value)} className="input h-11 text-base" />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-ink">Notas</span>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} className="input min-h-16 py-2 text-base" />
          </label>

          {/* Totales */}
          <div className="rounded-xl border border-line bg-white p-3 text-sm">
            <div className="flex justify-between text-muted">
              <span>Productos</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {envioNum > 0 && (
              <div className="flex justify-between text-muted">
                <span>Envío</span>
                <span>{formatPrice(envioNum)}</span>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-line pt-1 font-display text-lg font-black text-primary">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
            {costo > 0 && (
              <p className="mt-1 text-xs text-muted">
                Costo estimado {formatPrice(Math.round(costo))} · ganancia {formatPrice(Math.round(subtotal - costo))}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="btn btn-outline btn-md flex-1">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || lines.length === 0 || !cliente.trim()}
            className="btn btn-primary btn-md flex-1 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar pedido"}
          </button>
        </div>
      </form>
    </div>
  );
}
