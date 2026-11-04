"use client";

import { useCallback, useEffect, useState } from "react";
import { clubResumen, clubConfigGuardar, type ClubCliente, type ClubConfig } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { MoneyInput } from "./MoneyInput";
import { ErrorState } from "@/components/Estados";
import { CheckIcon } from "@/components/Icons";

/**
 * Club de sellos (sección Clientes del CRM): configuración del premio y
 * lista de clientes con sus sellos. Una compra pagada (web o cargada acá y
 * marcada cobrada / entregada) = un sello; en la compra número "meta" el
 * premio se descuenta solo en el checkout de la web.
 */
export function ClubPanel({ onToast }: { onToast: (msg: string) => void }) {
  const [config, setConfig] = useState<ClubConfig | null>(null);
  const [clientes, setClientes] = useState<ClubCliente[]>([]);
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">("cargando");
  const [abierto, setAbierto] = useState(false);
  // Formulario (se edita aparte para no pisar lo guardado hasta confirmar).
  const [premio, setPremio] = useState<number | "">("");
  const [meta, setMeta] = useState(6);
  const [desde, setDesde] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setEstado("cargando");
    const r = await clubResumen();
    if (!r) {
      setEstado("error");
      return;
    }
    setConfig(r.config);
    setClientes(r.clientes);
    setPremio(r.config.premio || "");
    setMeta(r.config.meta);
    setDesde(r.config.desde);
    setEstado("ok");
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    setError("");
    setGuardando(true);
    try {
      const c = await clubConfigGuardar({ premio: Number(premio) || 0, meta, desde });
      setConfig(c);
      onToast(c.activo ? `Club activo: ${formatPrice(c.premio)} en la ${c.meta}ª compra` : "Club apagado");
      const r = await clubResumen();
      if (r) setClientes(r.clientes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const listos = clientes.filter((c) => c.premioDisponible).length;
  const usados = clientes.reduce((a, c) => a + c.premios, 0);
  const conSellos = clientes.filter((c) => c.sellos > 0).length;
  const metaCfg = config?.meta ?? 6;

  return (
    <section className="rounded-2xl border border-line bg-white p-5" aria-busy={estado === "cargando"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">🎁 Club de sellos</p>
          {estado === "cargando" ? (
            <div className="mt-2 h-7 w-56 animate-pulse rounded-lg bg-page-soft motion-reduce:animate-none" />
          ) : config?.activo ? (
            <p className="mt-1 font-display text-2xl font-black text-primary">
              {formatPrice(config.premio)} <span className="text-base font-bold text-muted">en la {config.meta}ª compra</span>
            </p>
          ) : (
            <p className="mt-1 font-display text-xl font-black text-amber-600">Apagado</p>
          )}
          <p className="mt-1 text-xs text-muted">
            Cada compra pagada (web, o cargada acá y marcada cobrada o entregada) suma un sello. El premio se
            descuenta solo en el checkout y el contador vuelve a cero.
          </p>
        </div>
        {estado === "ok" && (
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-page-soft px-3 py-1 text-ink">{conSellos} con sellos</span>
            <span className={`rounded-full px-3 py-1 ${listos ? "bg-accent text-primary" : "bg-page-soft text-ink"}`}>
              {listos} con premio listo
            </span>
            <span className="rounded-full bg-page-soft px-3 py-1 text-ink">{usados} canjeados</span>
          </div>
        )}
      </div>

      {estado === "error" && <ErrorState className="mt-4" onRetry={cargar} />}

      {estado === "ok" && (
        <>
          {!config?.activo && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              Cargá el monto del premio para activarlo. Mientras esté en 0 la tienda no muestra nada del club.
            </p>
          )}

          <form onSubmit={guardar} className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_170px_auto] sm:items-end">
            <label className="block text-xs font-semibold text-muted">
              Premio (descuento fijo)
              <MoneyInput value={premio} onChange={setPremio} placeholder="0" aria-label="Monto del premio" wrapClassName="mt-1" className="input h-10 pl-7" />
            </label>
            <label className="block text-xs font-semibold text-muted">
              En la compra n.º
              <input
                type="number"
                min={2}
                max={20}
                value={meta}
                onChange={(e) => setMeta(Math.max(2, Math.min(20, Number(e.target.value) || 2)))}
                className="input mt-1 h-10"
                aria-label="Compra en la que toca el premio"
              />
            </label>
            <label className="block text-xs font-semibold text-muted">
              Contar compras desde
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="input mt-1 h-10"
                aria-label="Fecha desde la que cuentan las compras (vacío: todas)"
              />
            </label>
            <button type="submit" disabled={guardando} className="btn btn-primary btn-md disabled:opacity-60">
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            {error && <p className="text-xs font-semibold text-sale sm:col-span-4">{error}</p>}
            <p className="text-[11px] text-muted sm:col-span-4">
              Premio 0 = club apagado. &quot;Contar desde&quot; vacío = cuentan todas las compras pagadas de siempre.
            </p>
          </form>

          {config?.activo && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setAbierto((v) => !v)}
                aria-expanded={abierto}
                className="flex w-full items-center justify-between rounded-lg bg-page-soft px-3 py-2 text-sm font-semibold text-ink"
              >
                <span>Clientes con sellos ({clientes.length})</span>
                <span aria-hidden className={`transition-transform motion-reduce:transition-none ${abierto ? "rotate-180" : ""}`}>⌄</span>
              </button>
              {abierto &&
                (clientes.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">Todavía nadie sumó sellos.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-line">
                    {clientes.map((c, i) => (
                      <li key={`${c.email}|${c.telefono}|${i}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{c.nombre || c.email || c.telefono}</p>
                          <p className="truncate text-xs text-muted">
                            {[c.email, c.telefono].filter(Boolean).join(" · ")}
                            {c.ultima ? ` · última ${c.ultima.slice(0, 10)}` : ""}
                            {c.premios > 0 ? ` · ${c.premios} ${c.premios === 1 ? "premio usado" : "premios usados"}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ul className="flex items-center gap-1" aria-label={`${c.sellos} de ${metaCfg - 1} sellos`}>
                            {Array.from({ length: metaCfg - 1 }, (_, k) => (
                              <li
                                key={k}
                                className={`grid h-4 w-4 place-items-center rounded-full ${
                                  k < c.sellos ? "bg-primary text-accent" : "border border-line bg-white"
                                }`}
                              >
                                {k < c.sellos && <CheckIcon className="h-2.5 w-2.5" />}
                              </li>
                            ))}
                          </ul>
                          {c.premioDisponible ? (
                            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-primary">Premio listo</span>
                          ) : (
                            <span className="text-xs font-semibold tabular-nums text-muted">
                              {Math.min(c.sellos, metaCfg - 1)}/{metaCfg - 1}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
