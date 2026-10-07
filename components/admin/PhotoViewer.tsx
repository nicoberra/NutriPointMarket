"use client";

import { useEffect, useState } from "react";
import { CloseIcon } from "@/components/Icons";

/** Nombre de archivo legible para la descarga. */
function fileName(src: string, label: string): string {
  const ext = (src.split("?")[0].match(/\.(jpe?g|png|webp|gif)$/i)?.[1] || "jpg").toLowerCase();
  const base = label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${base || "foto"}.${ext}`;
}

/** Descarga la imagen (misma carpeta del sitio). Si no se puede, la abre en una pestaña. */
async function download(src: string, name: string) {
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch {
    window.open(src, "_blank", "noopener,noreferrer");
  }
}

/** Visor de una foto a pantalla completa con descarga. */
export function PhotoViewer({
  src,
  label,
  onClose,
}: {
  src: string;
  label: string;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const name = fileName(src, label);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Foto: ${label}`}
      className="fixed inset-0 z-[125] flex flex-col bg-black/90 animate-fade-in motion-reduce:animate-none"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-3 p-3 text-white" onClick={(e) => e.stopPropagation()}>
        <p className="min-w-0 truncate text-sm font-semibold">{label}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/15 hover:bg-white/25"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={label}
          onClick={(e) => e.stopPropagation()}
          className="max-h-full max-w-full rounded-lg object-contain shadow-drawer"
        />
      </div>

      <div
        className="flex flex-col gap-2 p-3 pb-[max(env(safe-area-inset-bottom),12px)] sm:flex-row sm:justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await download(src, name);
            setBusy(false);
          }}
          className="btn btn-primary btn-lg font-bold sm:min-w-[220px]"
        >
          {busy ? "Descargando…" : "⬇ Descargar foto"}
        </button>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-lg border-2 border-white/60 text-white hover:bg-white/10 sm:min-w-[220px]"
        >
          Abrir en pestaña nueva
        </a>
      </div>
    </div>
  );
}
