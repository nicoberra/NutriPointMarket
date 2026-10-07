"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ASSET_PREFIX } from "@/lib/config";

/**
 * Saludo al entrar a la tienda, estilo notificación de celular (arriba,
 * tarjeta redondeada) + notificación real del sistema si el usuario dio
 * permiso. Personalizado si sabemos el nombre (cuenta registrada o última
 * compra en este dispositivo). Se muestra una vez por visita.
 */

const SESSION_KEY = "sm-welcome-shown";
const NAME_KEY = "sm-cliente-nombre";
const ICON = "/icon-192.png";

type Msg = { title: string; body: string };

function firstName(n: string): string {
  const p = n.trim().split(/\s+/)[0] ?? "";
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : "";
}

async function systemNotify(m: Msg) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker?.ready;
    if (!reg) return;
    await reg.showNotification(m.title, {
      body: m.body,
      icon: ICON,
      badge: ICON,
      tag: "sm-bienvenida",
    });
  } catch {
    /* sin soporte: no pasa nada */
  }
}

export function WelcomeToast() {
  const { user } = useAuth();
  const [msg, setMsg] = useState<Msg | null>(null);
  const [visible, setVisible] = useState(false);
  const msgRef = useRef<Msg | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      /* ignore */
    }
    let name = user?.name ?? "";
    if (!name) {
      try {
        name = localStorage.getItem(NAME_KEY) ?? "";
      } catch {
        /* ignore */
      }
    }
    const fn = firstName(name);
    const m: Msg = fn
      ? { title: `¡Hola, ${fn}! 👋`, body: "Qué bueno verte otra vez por Suple Market." }
      : {
          title: "¡Bienvenido a Suple Market! 👋",
          body: "Suplementos originales · 10% off por transferencia.",
        };

    const show = setTimeout(() => {
      msgRef.current = m;
      setMsg(m);
      setVisible(true);
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
      systemNotify(m);
    }, 900);
    const hide = setTimeout(() => setVisible(false), 8000);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [user]);

  // El permiso de notificaciones solo se puede pedir tras un toque del usuario:
  // lo pedimos en el primer toque/click de la visita (una sola vez).
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "default") return;
    const ask = () => {
      Notification.requestPermission()
        .then((p) => {
          if (p === "granted" && msgRef.current) systemNotify(msgRef.current);
        })
        .catch(() => {});
    };
    window.addEventListener("pointerdown", ask, { once: true });
    return () => window.removeEventListener("pointerdown", ask);
  }, []);

  if (!msg) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed inset-x-0 top-3 z-[70] flex justify-center px-3 transition-[opacity,transform] duration-500 ease-enter motion-reduce:transition-none ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0"
      }`}
    >
      <div className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-line bg-white/95 p-3 pr-2 shadow-drawer backdrop-blur">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${ASSET_PREFIX}/personaje.png`}
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-xl bg-page-soft object-contain p-1"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{msg.title}</p>
          <p className="text-xs leading-snug text-muted">{msg.body}</p>
        </div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Cerrar"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-page-soft"
        >
          ×
        </button>
      </div>
    </div>
  );
}
