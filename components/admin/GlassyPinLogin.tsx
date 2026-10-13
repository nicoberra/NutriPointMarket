"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { crmLogin } from "@/lib/api";
import { gsap, useGSAP, MOTION_REDUCE } from "@/lib/gsap";

/**
 * Ingreso al CRM estilo "Glassy OTP": tarjeta de vidrio sobre fondo facetado,
 * una casilla por dígito (pop al escribir, foco automático, Backspace vuelve,
 * pegar reparte), y al verificar las casillas se juntan en un ✓ con brillo lima.
 * Misma seguridad que antes: el PIN se valida en el servidor (crm_login) con
 * bloqueo por intentos; acá solo cambia la interfaz.
 */
const PIN_LEN = 8; // largo del PIN actual; con otro largo se puede verificar desde 4 dígitos
const MIN_LEN = 4;

type Estado = "idle" | "verificando" | "ok" | "error";

// Facetas del fondo (viewBox 0 0 100 100): relieve sutil, decorativo.
const FACETAS = [
  "0,0 22,0 12,18", "22,0 48,0 30,14", "12,18 22,0 30,14", "48,0 74,0 60,16", "30,14 48,0 60,16",
  "74,0 100,0 88,20", "60,16 74,0 88,20", "0,0 12,18 0,34", "12,18 30,14 22,38", "0,34 12,18 22,38",
  "30,14 60,16 44,36", "22,38 30,14 44,36", "60,16 88,20 72,40", "44,36 60,16 72,40", "88,20 100,0 100,38",
  "72,40 88,20 100,38", "0,34 22,38 8,58", "22,38 44,36 34,60", "8,58 22,38 34,60", "44,36 72,40 58,62",
  "34,60 44,36 58,62", "72,40 100,38 86,64", "58,62 72,40 86,64", "86,64 100,38 100,70", "0,58 8,58 0,82",
  "8,58 34,60 18,84", "0,82 8,58 18,84", "34,60 58,62 46,86", "18,84 34,60 46,86", "58,62 86,64 72,88",
  "46,86 58,62 72,88", "86,64 100,70 100,100", "72,88 86,64 100,100", "0,82 18,84 0,100", "18,84 46,86 30,100",
  "0,100 18,84 30,100", "46,86 72,88 60,100", "30,100 46,86 60,100", "60,100 72,88 100,100",
];

export function GlassyPinLogin({ onOk }: { onOk: () => void }) {
  const [vals, setVals] = useState<string[]>(() => Array(PIN_LEN).fill(""));
  const [ver, setVer] = useState(false);
  const [estado, setEstado] = useState<Estado>("idle");
  const [error, setError] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const fila = useRef<HTMLDivElement>(null);
  const exito = useRef<HTMLDivElement>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const chars = useRef<(HTMLSpanElement | null)[]>([]);
  const cajas = useRef<(HTMLDivElement | null)[]>([]);
  const reduce = () => typeof window !== "undefined" && window.matchMedia(MOTION_REDUCE).matches;

  const { contextSafe } = useGSAP(
    () => {
      if (reduce()) return;
      gsap.from(card.current, { y: 28, opacity: 0, scale: 0.97, duration: 0.7, ease: "power3.out" });
      gsap.from(cajas.current, { y: 10, opacity: 0, duration: 0.4, ease: "power2.out", stagger: 0.04, delay: 0.25 });
    },
    { scope: root },
  );

  const foco = (i: number) => {
    const el = inputs.current[Math.max(0, Math.min(PIN_LEN - 1, i))];
    el?.focus();
    el?.select();
  };

  const pop = contextSafe((i: number) => {
    const c = chars.current[i];
    if (!c || reduce()) return;
    gsap.fromTo(c, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.34, ease: "back.out(2.6)", overwrite: true });
  });

  const animarError = contextSafe(() => {
    if (reduce() || !card.current) return;
    gsap.fromTo(card.current, { x: 0 }, { keyframes: { x: [0, -12, 11, -8, 7, -4, 3, 0] }, duration: 0.5, ease: "power1.out" });
  });

  // Las casillas se juntan en el centro y aparece una sola con el ✓.
  const animarExito = contextSafe((fin: () => void) => {
    const boxes = cajas.current.filter(Boolean) as HTMLDivElement[];
    if (reduce() || !fila.current || !exito.current) {
      setTimeout(fin, 500);
      return;
    }
    const r = fila.current.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const tl = gsap.timeline({ onComplete: () => { setTimeout(fin, 800); } });
    tl.to(boxes, {
      x: (i: number) => {
        const b = boxes[i].getBoundingClientRect();
        return cx - (b.left + b.width / 2);
      },
      duration: 0.5,
      ease: "power3.inOut",
    })
      .to(chars.current.filter(Boolean), { opacity: 0, scale: 0.6, duration: 0.18 }, "<")
      .to(boxes, { opacity: 0, duration: 0.15 }, "-=0.08")
      .fromTo(exito.current, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2.2)" }, "-=0.1")
      .fromTo(
        exito.current.querySelector("path"),
        { attr: { "stroke-dashoffset": 24 } },
        { attr: { "stroke-dashoffset": 0 }, duration: 0.35, ease: "power2.out" },
        "-=0.2",
      );
  });

  const verificar = async (codigo: string) => {
    if (estado === "verificando" || estado === "ok") return;
    setEstado("verificando");
    setError(null);
    const res = await crmLogin(codigo);
    if (res.ok) {
      setEstado("ok");
      animarExito(onOk);
      return;
    }
    setEstado("error");
    setError(
      res.reason === "conn"
        ? "No se pudo conectar. Revisá tu internet y probá de nuevo (tu PIN puede estar bien)."
        : res.reason === "blocked"
          ? "Demasiados intentos. Por seguridad el acceso queda bloqueado 15 minutos."
          : res.restantes != null && Number.isFinite(res.restantes)
            ? `PIN incorrecto. Te quedan ${res.restantes} intentos.`
            : "PIN incorrecto. Probá de nuevo.",
    );
    animarError();
    setTimeout(() => {
      setVals(Array(PIN_LEN).fill(""));
      setEstado("idle");
      foco(0);
    }, reduce() ? 0 : 520);
  };

  const escribir = (i: number, texto: string) => {
    const digitos = texto.replace(/\D/g, "");
    if (!digitos) return;
    const next = [...vals];
    // Si la casilla ya tenía un dígito, el nuevo es el último tecleado.
    const nuevos = digitos.length > 1 && vals[i] && digitos.length === 2 ? digitos.slice(-1) : digitos;
    let j = i;
    for (const d of nuevos) {
      if (j >= PIN_LEN) break;
      next[j] = d;
      pop(j);
      j++;
    }
    setVals(next);
    if (error) setError(null);
    const lleno = next.every(Boolean);
    if (lleno) {
      inputs.current[PIN_LEN - 1]?.blur();
      verificar(next.join(""));
    } else foco(j);
  };

  const onKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...vals];
      if (next[i]) next[i] = "";
      else if (i > 0) {
        next[i - 1] = "";
        foco(i - 1);
      }
      setVals(next);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      foco(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      foco(i + 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const codigo = vals.join("");
      if (codigo.length >= MIN_LEN) verificar(codigo);
    }
  };

  const codigo = vals.join("");
  const ok = estado === "ok";
  const err = estado === "error";
  const bloqueado = estado === "verificando" || ok;

  return (
    <div ref={root} className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05060f] p-5">
      {/* Fondo facetado con relieve */}
      <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="faceta" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1a1d3d" />
            <stop offset="1" stopColor="#05060f" />
          </linearGradient>
          <radialGradient id="luz" cx="0.5" cy="0.42" r="0.6">
            <stop offset="0" stopColor="#2129E3" stopOpacity="0.22" />
            <stop offset="1" stopColor="#2129E3" stopOpacity="0" />
          </radialGradient>
        </defs>
        {FACETAS.map((pts, i) => (
          <polygon
            key={i}
            points={pts}
            fill="url(#faceta)"
            opacity={0.45 + ((i * 37) % 55) / 100}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="0.15"
          />
        ))}
        <rect width="100" height="100" fill="url(#luz)" />
      </svg>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_120%,rgba(0,0,0,.65),transparent_60%)]" />

      <div className="relative w-full max-w-[400px]">
        <div
          ref={card}
          className="relative overflow-hidden rounded-[28px] border border-white/15 bg-white/[0.07] px-6 pb-7 pt-5 shadow-[0_30px_80px_-20px_rgba(0,0,0,.7)] backdrop-blur-xl backdrop-saturate-150 sm:px-8"
        >
          {/* Brillo de la tarjeta: lima al verificar, rojo si falla */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[28px] transition-opacity duration-500 motion-reduce:transition-none"
            style={{
              opacity: ok ? 1 : 0,
              background: "radial-gradient(90% 70% at 50% 40%, rgba(224,249,18,.22), rgba(224,249,18,.04) 60%, transparent)",
              boxShadow: "inset 0 0 0 1px rgba(224,249,18,.55), 0 0 60px -10px rgba(224,249,18,.45)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[28px] transition-opacity duration-300 motion-reduce:transition-none"
            style={{ opacity: err ? 1 : 0, boxShadow: "inset 0 0 0 1px rgba(239,68,68,.6), 0 0 50px -12px rgba(239,68,68,.55)" }}
          />
          <div aria-hidden className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/25" />

          <div className="relative text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#E0F912]/90">Suple Market · CRM</p>
            <h1 className="mt-2 font-display text-[22px] font-extrabold text-white" aria-live="polite">
              {ok ? "Verificado correctamente" : "Ingresá tu PIN"}
            </h1>
            <p className="mt-1 text-sm text-white/60">
              {ok ? "Entrando al panel…" : estado === "verificando" ? "Verificando…" : "Panel privado. Se verifica solo al completarlo."}
            </p>
          </div>

          {/* Casillas */}
          <div className="relative mt-7 flex justify-center">
            <div ref={fila} role="group" aria-label={`PIN de ${PIN_LEN} dígitos`} className="flex gap-1.5 sm:gap-2">
              {vals.map((v, i) => {
                const activa = !bloqueado && i === Math.min(codigo.length, PIN_LEN - 1);
                return (
                  <div
                    key={i}
                    ref={(el) => {
                      cajas.current[i] = el;
                    }}
                    className="group relative h-12 w-[34px] sm:h-14 sm:w-10"
                  >
                    {/* Brillo de la casilla activa (lima) o con error (rojo) */}
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute -inset-[3px] rounded-[14px] opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 motion-reduce:transition-none ${err ? "!opacity-100" : ""}`}
                      style={{
                        boxShadow: err
                          ? "0 0 0 1.5px rgba(239,68,68,.9), 0 0 18px rgba(239,68,68,.55)"
                          : "0 0 0 1.5px #E0F912, 0 0 18px rgba(224,249,18,.5)",
                      }}
                    />
                    <input
                      ref={(el) => {
                        inputs.current[i] = el;
                      }}
                      type={ver ? "text" : "password"}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={PIN_LEN}
                      aria-label={`Dígito ${i + 1} de ${PIN_LEN}`}
                      autoFocus={i === 0}
                      disabled={bloqueado}
                      value={v}
                      onChange={(e) => escribir(i, e.target.value)}
                      onKeyDown={(e) => onKey(i, e)}
                      onFocus={(e) => e.target.select()}
                      className={`h-full w-full rounded-xl border bg-white/[0.06] text-center text-transparent caret-[#E0F912] outline-none transition-colors duration-200 selection:bg-transparent motion-reduce:transition-none ${
                        activa ? "border-white/35" : "border-white/15"
                      } ${v ? "bg-white/[0.1]" : ""}`}
                    />
                    <span
                      ref={(el) => {
                        chars.current[i] = el;
                      }}
                      aria-hidden
                      className="pointer-events-none absolute inset-0 grid place-items-center font-display text-xl font-bold text-white"
                    >
                      {v ? (ver ? v : "•") : ""}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* La casilla única con el ✓ (aparece al verificar) */}
            <div
              ref={exito}
              aria-hidden={!ok}
              className="pointer-events-none absolute left-1/2 top-0 grid h-12 w-12 -translate-x-1/2 place-items-center rounded-xl border border-[#E0F912] bg-[#E0F912]/15 opacity-0 shadow-[0_0_28px_rgba(224,249,18,.55)] sm:h-14 sm:w-14"
              style={{ opacity: ok && reduce() ? 1 : undefined }}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="#E0F912" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.2 4.2L19 7" strokeDasharray="24" strokeDashoffset="0" />
              </svg>
            </div>
          </div>

          <div className="relative mt-5 min-h-[44px] text-center">
            {ok ? null : error ? (
              <p role="alert" className="rounded-lg bg-[#EF4444]/15 px-3 py-2 text-sm text-[#fca5a5]">
                {error}
              </p>
            ) : (
              <div className="flex items-center justify-center gap-4 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setVer((x) => !x)}
                  className="rounded-md px-1 text-white/60 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E0F912]"
                >
                  {ver ? "Ocultar PIN" : "Ver PIN"}
                </button>
                {codigo.length >= MIN_LEN && codigo.length < PIN_LEN && !bloqueado && (
                  <button
                    type="button"
                    onClick={() => verificar(codigo)}
                    className="rounded-md px-1 text-[#E0F912] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E0F912]"
                  >
                    Verificar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <Link
          href="/"
          className="mt-5 block text-center text-xs font-semibold text-white/50 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#E0F912]"
        >
          ← Volver a la tienda
        </Link>
      </div>
    </div>
  );
}
