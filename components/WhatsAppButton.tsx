"use client";

import { whatsappLink } from "@/lib/config";
import { WhatsappIcon } from "./Icons";

/** Botón flotante de WhatsApp (abajo a la derecha) con un pulso sutil cada 5 s. */
export function WhatsAppButton() {
  return (
    <div className="fixed bottom-5 right-5 z-[85]">
      {/* Onda de pulso (solo transform/opacity; se frena con "reducir movimiento") */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full bg-[#25D366] animate-wa-pulse motion-reduce:hidden"
      />
      <a
        href={whatsappLink()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Escribinos por WhatsApp"
        className="group relative flex items-center gap-0 overflow-hidden rounded-full bg-[#25D366] py-3.5 pl-3.5 pr-3.5 text-white shadow-drawer transition-[padding,transform] duration-300 ease-enter hover:pr-5 active:scale-95 motion-reduce:transition-none"
      >
        <WhatsappIcon className="h-7 w-7 shrink-0" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-[max-width,margin,opacity] duration-300 ease-enter group-hover:ml-2 group-hover:max-w-[140px] group-hover:opacity-100 motion-reduce:transition-none">
          Escribinos
        </span>
      </a>
    </div>
  );
}
