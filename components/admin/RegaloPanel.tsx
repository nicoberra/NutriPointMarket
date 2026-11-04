"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cuponConfigLeer, cuponConfigGuardar, listTable, type CuponConfig } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { MoneyInput } from "./MoneyInput";
import { whatsappCliente } from "./AdminRecords";
import { ErrorState } from "@/components/Estados";
import { WhatsappIcon } from "@/components/Icons";
import { SITE_URL } from "@/lib/seo";

interface Lead {
  id: string;
  fecha: string;
  nombre: string;
  telefono: string;
  email: string;
  origen: string;
  codigo: string;
  vence: string;
  usado: string;
}

const hoy = () => new Date(Date.now() - 3 * 3600 * 1000).toISOString().slice(0, 10);

/**
 * Regalo con cupón (sección Clientes del CRM): configuración del cupón que se
 * entrega en /regalo y lista de contactos que lo pidieron, con WhatsApp directo.
 */
export function RegaloPanel({ onToast }: { onToast: (msg: string) => void }) {
  const [config, setConfig] = useState<CuponConfig | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [estado, setEstado] = useState<"cargando" | "ok" | "error">("cargando");
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<"monto" | "porcentaje">("monto");
  const [valor, setValor] = useState<number | "">("");
  const [dias, setDias] = useState(30);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(async () => {
    setEstado("cargando");
    try {
      const [c, l] = await Promise.all([cuponConfigLeer(), listTable<Record<string, unknown>>("Leads")]);
      if (!c) throw new Error("sin config");
      setConfig(c);
      setTipo(c.tipo);
      setValor(c.valor || "");
      setDias(c.dias);
      setLeads(
        l
          .map((x) => ({
            id: String(x.id ?? ""),
            fecha: String(x.fecha ?? ""),
            nombre: String(x.nombre ?? ""),
            telefono: String(x.telefono ?? ""),
            email: String(x.email ?? ""),
            origen: String(x.origen ?? ""),
            codigo: String(x.codigo ?? ""),
            vence: String(x.vence ?? "").slice(0, 10),
            usado: String(x.usado ?? ""),
          }))
          .filter((x) => x.codigo)
          .reverse(),
      );
      setEstado("ok");
    } catch {
      setEstado("error");
    }
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
      const c = await cuponConfigGuardar({ tipo, valor: Number(valor) || 0, dias });
      setConfig(c);
      onToast(c.activo ? `Regalo activo: ${c.tipo === "porcentaje" ? `${c.valor}% OFF` : formatPrice(c.valor)}` : "Regalo apagado");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const stats = useMemo(() => {
    const h = hoy();
    const hace7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const origenes: Record<string, number> = {};
    let usados = 0;
    let semana = 0;
    for (const l of leads) {
      if (l.usado) usados++;
      if (l.fecha.slice(0, 10) >= hace7) semana++;
      const o = l.origen || "web";
      origenes[o] = (origenes[o] ?? 0) + 1;
    }
    return { usados, semana, hoy: h, origenes: Object.entries(origenes).sort((a, b) => b[1] - a[1]) };
  }, [leads]);

  const link = `${SITE_URL}/regalo`;
  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* se ve en pantalla */
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-white p-5" aria-busy={estado === "cargando"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">🎟️ Regalo con cupón</p>
          {estado === "cargando" ? (
            <div className="mt-2 h-7 w-56 animate-pulse rounded-lg bg-page-soft motion-reduce:animate-none" />
          ) : config?.activo ? (
            <p className="mt-1 font-display text-2xl font-black text-primary">
              {config.tipo === "porcentaje" ? `${config.valor}% OFF` : formatPrice(config.valor)}{" "}
              <span className="text-base font-bold text-muted">· vale {config.dias} días</span>
            </p>
          ) : (
            <p className="mt-1 font-display text-xl font-black text-amber-600">Apagado</p>
          )}
          <p className="mt-1 text-xs text-muted">
            El cliente deja su WhatsApp en la página del regalo y recibe un cupón único de un solo uso. El descuento
            se aplica y valida al confirmar el pedido.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <code className="rounded bg-page-soft px-2 py-1 font-semibold text-ink">{link}</code>
            <button type="button" onClick={copiarLink} className="font-semibold text-primary underline">
              {copiado ? "¡Copiado!" : "Copiar link"}
            </button>
          </div>
        </div>
        {estado === "ok" && (
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-page-soft px-3 py-1 text-ink">{leads.length} contactos</span>
            <span className="rounded-full bg-page-soft px-3 py-1 text-ink">{stats.semana} esta semana</span>
            <span className={`rounded-full px-3 py-1 ${stats.usados ? "bg-accent text-primary" : "bg-page-soft text-ink"}`}>
              {stats.usados} usados
            </span>
          </div>
        )}
      </div>

      {estado === "error" && <ErrorState className="mt-4" onRetry={cargar} />}

      {estado === "ok" && (
        <>
          {!config?.activo && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              Cargá el valor del cupón para activarlo. Mientras esté en 0, la página del regalo avisa que no hay uno activo.
            </p>
          )}

          <form onSubmit={guardar} className="mt-4 grid gap-3 sm:grid-cols-[150px_1fr_110px_auto] sm:items-end">
            <label className="block text-xs font-semibold text-muted">
              Tipo
              <select
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value === "porcentaje" ? "porcentaje" : "monto");
                  setValor("");
                }}
                className="input mt-1 h-10"
              >
                <option value="monto">Monto fijo ($)</option>
                <option value="porcentaje">Porcentaje (%)</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-muted">
              {tipo === "porcentaje" ? "Porcentaje (máx. 50)" : "Monto del descuento"}
              {tipo === "porcentaje" ? (
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={valor}
                  onChange={(e) => setValor(e.target.value === "" ? "" : Math.max(0, Math.min(50, Number(e.target.value))))}
                  className="input mt-1 h-10"
                  aria-label="Porcentaje del cupón"
                  placeholder="0"
                />
              ) : (
                <MoneyInput value={valor} onChange={setValor} placeholder="0" aria-label="Monto del cupón" wrapClassName="mt-1" className="input h-10 pl-7" />
              )}
            </label>
            <label className="block text-xs font-semibold text-muted">
              Vale (días)
              <input
                type="number"
                min={1}
                max={365}
                value={dias}
                onChange={(e) => setDias(Math.max(1, Math.min(365, Number(e.target.value) || 1)))}
                className="input mt-1 h-10"
                aria-label="Días de validez del cupón"
              />
            </label>
            <button type="submit" disabled={guardando} className="btn btn-primary btn-md disabled:opacity-60">
              {guardando ? "Guardando…" : "Guardar"}
            </button>
            {error && <p className="text-xs font-semibold text-sale sm:col-span-4">{error}</p>}
            <p className="text-[11px] text-muted sm:col-span-4">
              Valor 0 = regalo apagado (los cupones ya entregados dejan de servir mientras esté apagado).
            </p>
          </form>

          {stats.origenes.length > 0 && (
            <p className="mt-4 text-xs text-muted">
              <span className="font-semibold text-ink">De dónde vienen: </span>
              {stats.origenes.map(([o, n]) => `${o} (${n})`).join(" · ")}
            </p>
          )}

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setAbierto((v) => !v)}
              aria-expanded={abierto}
              className="flex w-full items-center justify-between rounded-lg bg-page-soft px-3 py-2 text-sm font-semibold text-ink"
            >
              <span>Contactos que pidieron el regalo ({leads.length})</span>
              <span aria-hidden className={`transition-transform motion-reduce:transition-none ${abierto ? "rotate-180" : ""}`}>⌄</span>
            </button>
            {abierto &&
              (leads.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Todavía nadie pidió el regalo.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line">
                  {leads.map((l) => {
                    const vencido = !l.usado && l.vence && l.vence < stats.hoy;
                    const wa = whatsappCliente(
                      l.telefono,
                      `Hola${l.nombre ? ` ${l.nombre.split(" ")[0]}` : ""}! Te escribimos de Suple Market por tu cupón ${l.codigo}. ¿Te ayudamos a elegir?`,
                    );
                    return (
                      <li key={l.id || l.codigo} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink">{l.nombre || l.telefono || l.email}</p>
                          <p className="truncate text-xs text-muted">
                            {[l.telefono, l.email].filter(Boolean).join(" · ")} · {l.fecha.slice(0, 10)} · {l.origen || "web"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-page-soft px-1.5 py-0.5 text-[11px] font-semibold text-ink">{l.codigo}</code>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              l.usado ? "bg-accent text-primary" : vencido ? "bg-page-soft text-muted" : "bg-primary/10 text-primary"
                            }`}
                          >
                            {l.usado ? "Usado" : vencido ? "Vencido" : "Disponible"}
                          </span>
                          {wa && (
                            <a
                              href={wa}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Escribirle por WhatsApp a ${l.nombre || l.telefono}`}
                              className="grid h-8 w-8 place-items-center rounded-full bg-[#25D366] text-white hover:brightness-105"
                            >
                              <WhatsappIcon className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ))}
          </div>
        </>
      )}
    </section>
  );
}
