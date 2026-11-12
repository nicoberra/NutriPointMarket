"use client";

import { useEffect, useState } from "react";
import { activarAvisos, estadoAvisos, probarAvisos, type EstadoAvisos } from "@/lib/push";

/**
 * Inicio del CRM: activar en este dispositivo los avisos de cada compra web.
 * Solo se muestra mientras NO están activados; activados, desaparece.
 */
export function AvisosCompras({ onToast }: { onToast: (t: string) => void }) {
  const [estado, setEstado] = useState<EstadoAvisos>("cargando");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    let vivo = true;
    estadoAvisos().then((e) => vivo && setEstado(e));
    return () => {
      vivo = false;
    };
  }, []);

  const activar = async () => {
    setOcupado(true);
    const r = await activarAvisos();
    setOcupado(false);
    if (r.ok) {
      setEstado("activo");
      onToast("Avisos activados ✓ Te mando una prueba…");
      const p = await probarAvisos();
      if (!p.ok) onToast(p.error || "No llegó la prueba");
    } else {
      onToast(r.error || "No se pudieron activar");
      setEstado(await estadoAvisos());
    }
  };

  // Ya activados en este dispositivo: no se muestra nada (pedido del usuario).
  if (estado === "cargando" || estado === "no-soportado" || estado === "activo") return null;

  return (
    <section className="rounded-2xl border border-primary/20 bg-white p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <span aria-hidden className="text-2xl leading-none">🔔</span>
        <div className="flex-1">
          <h2 className="text-sm font-bold text-ink">Avisos de compras web</h2>
          {estado === "ios-instalar" ? (
            <p className="mt-1 text-xs leading-relaxed text-muted">
              En iPhone los avisos llegan solo si abrís el CRM desde su ícono: en Safari tocá Compartir →
              “Agregar a inicio”, abrilo desde ese ícono y activalos acá.
            </p>
          ) : estado === "bloqueado" ? (
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Las notificaciones están bloqueadas para el CRM. Habilitalas en los ajustes del navegador (permisos
              del sitio) y volvé a esta pantalla.
            </p>
          ) : (
            <>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                Te llega una notificación a este dispositivo cada vez que alguien compra en la web, aunque tengas el
                CRM cerrado.
              </p>
              <button
                type="button"
                onClick={activar}
                disabled={ocupado}
                className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-60"
              >
                {ocupado ? "Activando…" : "Activar avisos"}
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
