"use client";

import { useState } from "react";

/**
 * Botón "Link": copia una URL al portapapeles y avisa "Copiado ✓".
 * Si el navegador no deja copiar, ofrece compartir o abre el link.
 * Al lado, un botón para abrir esa página de la web en otra pestaña.
 */
export function CopyLinkButton({ url, label = "Link", title }: { url: string; label?: string; title?: string }) {
  return (
    <span className="flex shrink-0 items-center">
      <CopiarLink url={url} label={label} title={title} />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title="Abrir en la web"
        aria-label="Abrir en la web"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-primary transition-colors hover:bg-page-soft"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M14 4h6v6" />
          <path d="M20 4 11 13" />
          <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        </svg>
      </a>
    </span>
  );
}

function CopiarLink({ url, label, title }: { url: string; label: string; title?: string }) {
  const [ok, setOk] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setOk(true);
      setTimeout(() => setOk(false), 1800);
    } catch {
      if (navigator.share) navigator.share({ url }).catch(() => {});
      else window.open(url, "_blank", "noopener,noreferrer");
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={url}
      aria-label={title ?? "Copiar link"}
      className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors ${
        ok ? "bg-green-100 text-green-700" : "text-primary hover:bg-page-soft"
      }`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
        <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
      </svg>
      {ok ? "Copiado ✓" : label}
    </button>
  );
}
