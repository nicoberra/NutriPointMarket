"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

/**
 * Diálogo de confirmación propio del CRM (reemplaza window.confirm, que en
 * apps instaladas a veces no aparece). Uso:
 *   const { confirm, dialog } = useConfirm();
 *   if (!(await confirm({ title: "¿Borrar X?" }))) return;
 *   ... y renderizar {dialog} en el JSX.
 * "No" (o tocar afuera / Escape) devuelve false; "Sí" devuelve true.
 */
type Opts = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export function useConfirm(): { confirm: (o: Opts) => Promise<boolean>; dialog: ReactNode } {
  const [opts, setOpts] = useState<Opts | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback(
    (o: Opts) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setOpts(o);
      }),
    [],
  );
  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  };

  const dialog = opts ? (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="crm-confirm-title"
      className="fixed inset-0 z-[130] flex items-end justify-center p-4 sm:items-center"
      onKeyDown={(e) => {
        if (e.key === "Escape") close(false);
      }}
    >
      <div
        className="absolute inset-0 animate-fade-in bg-black/50 motion-reduce:animate-none"
        onClick={() => close(false)}
      />
      <div className="relative w-full max-w-sm animate-section-in rounded-2xl bg-white p-5 shadow-drawer motion-reduce:animate-none">
        <h3 id="crm-confirm-title" className="font-display text-lg font-bold text-ink">
          {opts.title}
        </h3>
        {opts.message && <p className="mt-1.5 text-sm text-muted">{opts.message}</p>}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            autoFocus
            onClick={() => close(false)}
            className="btn btn-outline btn-md"
          >
            {opts.cancelLabel ?? "No, cancelar"}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className="btn btn-md bg-sale font-bold text-white hover:brightness-110"
          >
            {opts.confirmLabel ?? "Sí, eliminar"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, dialog };
}
