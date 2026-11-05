"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cajaLeer, cajaGuardar, type CajaConfig } from "@/lib/api";
import { peekTable, ensureTable, subscribeTable } from "@/lib/tableCache";
import { calcularCaja, pedidoCobrado, MEDIOS, type Medio } from "@/lib/caja";
import { formatPrice } from "@/lib/format";
import { MoneyInput } from "./MoneyInput";
import { ErrorState } from "@/components/Estados";

type Fila = Record<string, unknown>;

function fechaHora(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const plata = (n: number) => (n < 0 ? `− ${formatPrice(-n)}` : formatPrice(n));

/**
 * Facturación · Plata que deberías tener: saldo cargado por el usuario (efectivo,
 * transferencia y Mercado Pago) + ventas cobradas − compras, contando lo que se
 * cargó después de fijar el saldo. "Ajustar saldo" lo vuelve a fijar con lo real.
 */
export function CajaPanel() {
  const [cfg, setCfg] = useState<CajaConfig | null>(null);
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">("cargando");
  const [pedidos, setPedidos] = useState<Fila[]>(() => peekTable<Fila>("Pedidos") ?? []);
  const [compras, setCompras] = useState<Fila[]>(() => peekTable<Fila>("Compras") ?? []);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<Record<Medio, number | "">>({ efectivo: "", transferencia: "", mercadopago: "" });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [detalle, setDetalle] = useState(false);

  const cargar = useCallback(async () => {
    setEstado("cargando");
    try {
      const c = await cajaLeer();
      if (!c) throw new Error("sin datos");
      setCfg(c);
      setEstado("ok");
    } catch {
      setEstado("error");
    }
  }, []);

  useEffect(() => {
    void cargar();
    const u1 = subscribeTable("Pedidos", setPedidos);
    const u2 = subscribeTable("Compras", setCompras);
    ensureTable<Fila>("Pedidos").catch(() => {});
    ensureTable<Fila>("Compras").catch(() => {});
    return () => {
      u1();
      u2();
    };
  }, [cargar]);

  const res = useMemo(() => (cfg?.configurada ? calcularCaja(cfg, pedidos, compras) : null), [cfg, pedidos, compras]);

  const abrir = () => {
    // Se propone lo que debería haber hoy: el usuario corrige con lo real.
    setForm({
      efectivo: res ? res.saldo.efectivo : "",
      transferencia: res ? res.saldo.transferencia : "",
      mercadopago: res ? res.saldo.mercadopago : "",
    });
    setError("");
    setEditando(true);
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    setGuardando(true);
    setError("");
    try {
      const pendientes = pedidos.filter((r) => !pedidoCobrado(r) && r.id).map((r) => String(r.id));
      const c = await cajaGuardar({
        efectivo: Number(form.efectivo) || 0,
        transferencia: Number(form.transferencia) || 0,
        mercadopago: Number(form.mercadopago) || 0,
        pendientes,
      });
      setCfg(c);
      setEditando(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const formulario = (
    <form onSubmit={guardar} className="mt-4 space-y-3">
      <p className="text-xs text-muted">
        Poné cuánto tenés <b>ahora</b> en cada lado. Desde este momento se suman las ventas que cobres y se restan las
        compras que cargues, cada una en su forma de pago.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {MEDIOS.map((m) => (
          <label key={m.id} className="block text-xs font-semibold text-muted">
            {m.label}
            <MoneyInput
              value={form[m.id]}
              onChange={(n) => setForm((f) => ({ ...f, [m.id]: n }))}
              placeholder="0"
              aria-label={`Saldo en ${m.label}`}
              wrapClassName="mt-1"
              className="input h-10 pl-7"
            />
          </label>
        ))}
      </div>
      {error && <p className="text-xs font-semibold text-sale">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={guardando} className="btn btn-primary btn-md disabled:opacity-60">
          {guardando ? "Guardando…" : "Guardar saldo"}
        </button>
        {cfg?.configurada && (
          <button type="button" onClick={() => setEditando(false)} className="btn btn-outline btn-md">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );

  return (
    <section className="rounded-2xl border border-line bg-white p-5" aria-busy={estado === "cargando"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">💵 Plata que deberías tener</p>
          {estado === "cargando" ? (
            <div className="mt-2 h-9 w-48 animate-pulse rounded-lg bg-page-soft motion-reduce:animate-none" />
          ) : res ? (
            <p className={`mt-1 font-display text-3xl font-black ${res.total < 0 ? "text-sale" : "text-primary"}`}>{plata(res.total)}</p>
          ) : null}
          {cfg?.configurada && (
            <p className="mt-1 text-xs text-muted">Saldo fijado el {fechaHora(cfg.desde)} + ventas cobradas − compras cargadas después</p>
          )}
        </div>
        {res && !editando && (
          <button type="button" onClick={abrir} className="btn btn-outline btn-md">
            Ajustar saldo
          </button>
        )}
      </div>

      {estado === "error" && <ErrorState className="mt-4" onRetry={cargar} />}

      {estado === "ok" && !cfg?.configurada && formulario}

      {estado === "ok" && res && (
        <>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {MEDIOS.map((m) => (
              <div key={m.id} className="rounded-xl bg-page-soft p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-muted">{m.label}</p>
                <p className={`mt-1 font-display text-2xl font-black ${res.saldo[m.id] < 0 ? "text-sale" : "text-ink"}`}>{plata(res.saldo[m.id])}</p>
                {detalle && cfg && (
                  <dl className="mt-2 space-y-0.5 text-xs">
                    <div className="flex justify-between"><dt className="text-muted">Saldo fijado</dt><dd className="font-semibold text-ink">{plata(cfg[m.id])}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">Ventas cobradas</dt><dd className="font-semibold text-green-700">+ {formatPrice(res.ventas[m.id])}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted">Compras</dt><dd className="font-semibold text-sale">− {formatPrice(res.compras[m.id])}</dd></div>
                  </dl>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setDetalle((v) => !v)} aria-expanded={detalle} className="mt-3 text-xs font-semibold text-primary underline">
            {detalle ? "Ocultar detalle" : `Ver detalle (${res.nVentas} ${res.nVentas === 1 ? "venta" : "ventas"} y ${res.nCompras} ${res.nCompras === 1 ? "compra" : "compras"} desde el saldo)`}
          </button>
          {(res.comprasSinMedio.n > 0 || res.ventasSinMedio.n > 0) && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              {res.comprasSinMedio.n > 0 &&
                `${res.comprasSinMedio.n} ${res.comprasSinMedio.n === 1 ? "compra" : "compras"} sin forma de pago (${formatPrice(res.comprasSinMedio.monto)}) no se restaron. `}
              {res.ventasSinMedio.n > 0 &&
                `${res.ventasSinMedio.n} ${res.ventasSinMedio.n === 1 ? "venta cobrada" : "ventas cobradas"} sin forma de pago (${formatPrice(res.ventasSinMedio.monto)}) no se sumaron.`}
              {" "}Cargales la forma de pago para que entren en la cuenta.
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted">Mercado Pago: lo cobrado, sin descontar la comisión.</p>
          {editando && formulario}
        </>
      )}
    </section>
  );
}
