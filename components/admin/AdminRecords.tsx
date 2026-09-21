"use client";

import { useEffect, useState } from "react";
import { listTable, addRow, updateRow } from "@/lib/api";
import { whatsappLink } from "@/lib/config";
import { CloseIcon, PlusIcon, WhatsappIcon, CheckIcon } from "@/components/Icons";

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "tel" | "number" | "date" | "textarea";
  required?: boolean;
}

export interface RecordsConfig {
  tab: string;
  addLabel: string;
  fields: FieldDef[];
  /** Título principal de cada fila */
  primary: (r: Record<string, string>) => string;
  /** Línea secundaria */
  secondary: (r: Record<string, string>) => string;
  /** Muestra estado Pendiente/Entregado con toggle (para Pedidos) */
  estado?: boolean;
}

type Row = Record<string, string>;

export function AdminRecords({
  config,
  onToast,
}: {
  config: RecordsConfig;
  onToast: (m: string) => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listTable<Row>(config.tab)
      .then((data) => {
        // más reciente primero (por fecha o por orden inverso de la planilla)
        setRows([...data].reverse());
      })
      .catch(() => onToast("No se pudo cargar"))
      .finally(() => setLoading(false));
  };

  useEffect(load, [config.tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (obj: Row) => {
    setSaving(true);
    const ok = await addRow(config.tab, obj);
    setSaving(false);
    setAdding(false);
    onToast(ok ? "Guardado ✓" : "Guardado (verificá)");
    // recargar tras un momento (la escritura es asíncrona)
    setTimeout(load, 1200);
  };

  const toggleEstado = async (row: Row) => {
    const nuevo = row.estado === "Entregado" ? "Pendiente" : "Entregado";
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, estado: nuevo } : r)),
    );
    await updateRow(config.tab, row.id, { estado: nuevo });
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => setAdding(true)}
        className="btn btn-primary btn-md w-full"
      >
        <PlusIcon className="h-5 w-5" /> {config.addLabel}
      </button>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted">Cargando…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white py-12 text-center text-sm text-muted">
          Todavía no hay registros.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li
              key={r.id || i}
              className="flex items-center gap-3 rounded-xl border border-line bg-white p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {config.primary(r) || "—"}
                </p>
                <p className="truncate text-xs text-muted">{config.secondary(r)}</p>
                {config.estado && (
                  <button
                    onClick={() => toggleEstado(r)}
                    className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                      r.estado === "Entregado"
                        ? "bg-accent/15 text-primary"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {r.estado === "Entregado" ? (
                      <>
                        <CheckIcon className="h-3.5 w-3.5" /> Entregado
                      </>
                    ) : (
                      "Pendiente"
                    )}
                  </button>
                )}
              </div>
              {r.telefono && (
                <a
                  href={whatsappLink(`Hola ${r.cliente || r.nombre || ""}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#25D366]/10 text-[#25D366]"
                >
                  <WhatsappIcon className="h-5 w-5" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <AddSheet
          config={config}
          saving={saving}
          onClose={() => setAdding(false)}
          onSave={handleAdd}
        />
      )}
    </div>
  );
}

function AddSheet({
  config,
  saving,
  onClose,
  onSave,
}: {
  config: RecordsConfig;
  saving: boolean;
  onClose: () => void;
  onSave: (r: Row) => void;
}) {
  const [form, setForm] = useState<Row>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-page p-5 sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-primary">
            {config.addLabel}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-page-soft"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {config.fields.map((f) => (
            <label key={f.key} className="block">
              <span className="mb-1 block text-xs font-semibold text-ink">
                {f.label} {f.required && <span className="text-sale">*</span>}
              </span>
              {f.type === "textarea" ? (
                <textarea
                  required={f.required}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  className="input min-h-20 py-2 text-base"
                />
              ) : (
                <input
                  type={f.type ?? "text"}
                  inputMode={f.type === "number" ? "numeric" : undefined}
                  required={f.required}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  className="input h-11 text-base"
                />
              )}
            </label>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="btn btn-outline btn-md flex-1">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn btn-primary btn-md flex-1">
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
