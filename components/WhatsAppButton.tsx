"use client";

import { whatsappLink } from "@/lib/config";
import { WhatsappIcon } from "./Icons";

/** Botón flotante de WhatsApp (abajo a la derecha). */
export function WhatsAppButton() {
  return (
    <a
      href={whatsappLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp"
      className="group fixed bottom-5 right-5 z-[85] flex items-center gap-0 overflow-hidden rounded-full bg-[#25D366] pl-3.5 pr-3.5 py-3.5 text-white shadow-drawer transition-all hover:pr-5"
    >
      <WhatsappIcon className="h-7 w-7 shrink-0" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-300 group-hover:ml-2 group-hover:max-w-[140px] group-hover:opacity-100">
        Escribinos
      </span>
    </a>
  );
}
