"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cuponConfigPublica, pedirRegalo, type CuponConfig, type LeadResultado } from "@/lib/api";
import { guardarCupon, leerCupon, textoRegalo } from "@/lib/cupon";
import { whatsappLink } from "@/lib/config";
import { Trampa, leerTrampa } from "@/components/Trampa";
import { CheckIcon, WhatsappIcon } from "@/components/Icons";
import { formatPrice } from "@/lib/format";
import { ENVIO_GRATIS_DESDE } from "@/lib/envios";

/** Fecha "2026-12-04" → "04/12". */
function fechaCorta(iso: string): string {
  const [, m, d] = iso.split("-");
  return d && m ? `${d}/${m}` : iso;
}

/**
 * /regalo: el cliente deja su WhatsApp (y email opcional) y recibe un cupón
 * único. Es el destino de los llamados a la acción de Instagram (bio, reels,
 * historias y mensajes automáticos). ?origen=ig-reel registra de dónde vino.
 */
export default function RegaloPage() {
  const [config, setConfig] = useState<CuponConfig | null | undefined>(undefined);
  const [res, setRes] = useState<LeadResultado | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState(false);
  const origen = useRef("web");
  const tarjeta = useRef<HTMLDivElement>(null);
  // En el celu el ticket queda abajo del texto: se lleva la pantalla hasta él.
  useEffect(() => {
    if (res) tarjeta.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  }, [res]);

  useEffect(() => {
    try {
      const o = new URLSearchParams(window.location.search).get("origen");
      if (o) origen.current = o.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40) || "web";
    } catch {
      /* ignore */
    }
    let vivo = true;
    cuponConfigPublica().then((c) => {
      if (vivo) setConfig(c);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (enviando) return;
    const fd = new FormData(e.currentTarget);
    setError("");
    setEnviando(true);
    try {
      const r = await pedirRegalo({
        nombre: String(fd.get("nombre") || "").trim(),
        telefono: String(fd.get("telefono") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        origen: origen.current,
        hp: leerTrampa(e.currentTarget),
      });
      if (r.enmascarado) {
        // Ya lo había pedido: si está guardado en este celular, se muestra completo.
        const g = leerCupon();
        setRes(g && g.codigo.slice(-2) === r.codigo.slice(-2) ? { ...r, codigo: g.codigo, enmascarado: false } : r);
      } else {
        if (r.disponible) guardarCupon({ codigo: r.codigo, tipo: r.tipo, valor: r.valor });
        setRes(r);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar tu cupón. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const copiar = async () => {
    if (!res) return;
    try {
      await navigator.clipboard.writeText(res.codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* el código igual se ve en pantalla */
    }
  };

  const regalo = config?.activo ? textoRegalo(config) : "";

  return (
    <div className="relative overflow-hidden bg-primary">
      {/* Luces de fondo */}
      <span aria-hidden className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

      <div className="container-page relative grid min-h-[78vh] items-center gap-10 py-14 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        {/* Texto */}
        <div className="text-white">
          <p className="animate-slide-up text-xs font-bold uppercase tracking-[0.28em] text-accent motion-reduce:animate-none">
            Regalo Suple Market
          </p>
          {config === undefined ? (
            <div className="mt-4 space-y-3" aria-hidden>
              <div className="h-12 w-4/5 animate-pulse rounded-xl bg-white/15 motion-reduce:animate-none" />
              <div className="h-12 w-3/5 animate-pulse rounded-xl bg-white/15 motion-reduce:animate-none" />
            </div>
          ) : config?.activo ? (
            <h1 className="mt-3 animate-slide-up font-display text-4xl font-black leading-[1.02] tracking-tight [animation-delay:80ms] motion-reduce:animate-none sm:text-5xl lg:text-6xl">
              Llevate <span className="text-accent">{regalo}</span> en tu compra
            </h1>
          ) : (
            <h1 className="mt-3 font-display text-4xl font-black leading-tight tracking-tight sm:text-5xl">
              Ahora no hay un regalo activo
            </h1>
          )}
          <p className="mt-5 max-w-md animate-slide-up text-base leading-relaxed text-white/80 [animation-delay:160ms] motion-reduce:animate-none">
            {config?.activo
              ? `Dejá tu WhatsApp y te damos un cupón único para usar en suplemarket.com.ar. Vale ${config.dias} días y se aplica solo en el checkout.`
              : config === null
                ? "No pudimos conectarnos. Revisá tu conexión y recargá la página."
                : config === undefined
                  ? " "
                  : "Seguinos en Instagram: cuando lancemos el próximo regalo te enterás primero."}
          </p>
          {config?.activo && (
            <ul className="mt-6 space-y-2 text-sm text-white/85">
              {["Cupón único a tu nombre", "Se aplica solo al confirmar el pedido", `Envío gratis en CABA y GBA desde ${formatPrice(ENVIO_GRATIS_DESDE)}`].map((t, i) => (
                <li
                  key={t}
                  className="flex animate-slide-up items-center gap-2 motion-reduce:animate-none"
                  style={{ animationDelay: `${240 + i * 70}ms` }}
                >
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-accent text-primary">
                    <CheckIcon className="h-3 w-3" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tarjeta */}
        <div ref={tarjeta} className="animate-slide-up scroll-mt-28 [animation-delay:200ms] motion-reduce:animate-none">
          {res ? (
            <div className="rounded-3xl bg-white p-6 shadow-drawer sm:p-8">
              {res.enmascarado ? (
                <>
                  <p className="font-display text-xl font-bold text-primary">Ya pediste tu cupón</p>
                  <p className="mt-2 text-sm text-muted">
                    Con ese WhatsApp ya hay un cupón ({res.codigo}). Lo tenés guardado en el celular donde lo pediste y
                    se aplica solo al confirmar el pedido. Si no lo encontrás, escribinos y te lo reenviamos.
                  </p>
                  <a
                    href={whatsappLink(`Hola Suple Market! Pedí el regalo pero no encuentro mi cupón (${res.codigo}). ¿Me lo reenvían?`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-md mt-5 w-full bg-[#25D366] font-bold text-white hover:brightness-105"
                  >
                    <WhatsappIcon className="h-5 w-5" /> Pedir que me lo reenvíen
                  </a>
                  <Link href="/productos" className="btn btn-outline btn-md mt-3 w-full">
                    Ver productos
                  </Link>
                </>
              ) : res.disponible ? (
                <>
                  <p className="text-sm font-semibold text-muted">
                    {res.repetido ? "Ya tenías tu cupón guardado acá" : "¡Listo! Este es tu cupón"}
                  </p>
                  {/* Ticket */}
                  <div className="relative mt-4 overflow-hidden rounded-2xl border-2 border-dashed border-primary/30 bg-accent-soft px-5 py-6 text-center">
                    <span aria-hidden className="absolute -left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white" />
                    <span aria-hidden className="absolute -right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-white" />
                    <p className="font-display text-sm font-bold uppercase tracking-widest text-primary/70">{textoRegalo(res)}</p>
                    <p className="mt-2 animate-badge-pop whitespace-nowrap font-display text-[clamp(1.5rem,7.5vw,2.25rem)] font-black tracking-wider text-primary motion-reduce:animate-none">
                      {res.codigo}
                    </p>
                    {res.vence && <p className="mt-2 text-xs font-semibold text-muted">Vale hasta el {fechaCorta(res.vence)}</p>}
                  </div>
                  <button type="button" onClick={copiar} className="btn btn-outline btn-md mt-4 w-full">
                    {copiado ? (
                      <>
                        <CheckIcon className="h-4 w-4" /> Copiado
                      </>
                    ) : (
                      "Copiar código"
                    )}
                  </button>
                  <Link href="/productos" className="btn btn-primary btn-lg mt-3 w-full font-bold">
                    Usarlo ahora
                  </Link>
                  <a
                    href={whatsappLink(`Hola Suple Market! Pedí mi regalo, mi cupón es ${res.codigo}. Quería consultar por…`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-md mt-3 w-full bg-[#25D366] font-bold text-white hover:brightness-105"
                  >
                    <WhatsappIcon className="h-5 w-5" /> Consultanos por WhatsApp
                  </a>
                  <p className="mt-4 text-center text-xs text-muted">
                    Ya quedó guardado en este celular: se aplica solo cuando confirmás el pedido.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-display text-xl font-bold text-primary">Tu cupón {res.codigo}</p>
                  <p className="mt-2 text-sm text-muted">{res.motivo}</p>
                  <Link href="/productos" className="btn btn-primary btn-md mt-5 w-full">
                    Ver productos
                  </Link>
                </>
              )}
            </div>
          ) : config?.activo ? (
            <form onSubmit={enviar} className="relative rounded-3xl bg-white p-6 shadow-drawer sm:p-8">
              <Trampa />
              <p className="font-display text-xl font-bold text-primary">Pedí tu cupón</p>
              <p className="mt-1 text-sm text-muted">Tarda 10 segundos. No te llenamos de mensajes.</p>
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">Nombre</span>
                  <input name="nombre" autoComplete="given-name" className="input h-11 text-base" placeholder="Tu nombre" maxLength={80} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    WhatsApp <span className="text-sale">*</span>
                  </span>
                  <input
                    name="telefono"
                    type="tel"
                    required
                    inputMode="tel"
                    autoComplete="tel"
                    className="input h-11 text-base"
                    placeholder="11 5555 5555"
                    maxLength={30}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    Email <span className="font-normal text-muted">(opcional)</span>
                  </span>
                  <input name="email" type="email" autoComplete="email" className="input h-11 text-base" placeholder="tu@email.com" maxLength={120} />
                </label>
              </div>
              {error && (
                <p role="alert" className="mt-4 rounded-lg bg-sale/10 px-3 py-2 text-sm text-sale">
                  {error}
                </p>
              )}
              <button type="submit" disabled={enviando} className="btn btn-primary btn-lg mt-5 w-full font-bold disabled:opacity-60">
                {enviando ? "Generando tu cupón…" : "Quiero mi cupón"}
              </button>
              <p className="mt-3 text-center text-xs text-muted">
                Al pedirlo aceptás los{" "}
                <Link href="/terminos/" className="font-semibold text-primary underline">
                  Términos y condiciones
                </Link>
                . Un cupón por persona.
              </p>
            </form>
          ) : config === undefined ? (
            <div className="h-[420px] animate-pulse rounded-3xl bg-white/15 motion-reduce:animate-none" aria-hidden />
          ) : (
            <div className="rounded-3xl bg-white p-8 text-center shadow-drawer">
              <p className="font-display text-xl font-bold text-primary">Mientras tanto…</p>
              <p className="mt-2 text-sm text-muted">Mirá los productos y las promos de la semana.</p>
              <Link href="/productos" className="btn btn-primary btn-md mt-5">
                Ver productos
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
