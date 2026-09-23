"use client";

import { useState } from "react";
import { useCategories } from "@/context/CategoriesContext";
import { addCategory, renameCategory, deleteCategory } from "@/lib/api";
import { CloseIcon, PlusIcon, TrashIcon, CheckIcon } from "@/components/Icons";

/**
 * Gestor de categorías (modal del CRM). Agregar, renombrar y borrar.
 * Al renombrar, el backend actualiza los productos de esa categoría.
 */
export function AdminCategories({
  onClose,
  onToast,
  onChanged,
}: {
  onClose: () => void;
  onToast: (m: string) => void;
  onChanged: () => void;
}) {
  const { categories, refresh } = useCategories();
  const [nueva, setNueva] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const add = async () => {
    const name = nueva.trim();
    if (!name || busy) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      onToast("Esa categoría ya existe");
      return;
    }
    setBusy(true);
    const ok = await addCategory(name, categories.length + 1);
    setBusy(false);
    setNueva("");
    onToast(ok ? "Categoría agregada ✓" : "Guardado (verificá)");
    await refresh();
  };

  const saveRename = async (oldName: string) => {
    const to = editName.trim();
    setEditing(null);
    if (!to || to === oldName) return;
    setBusy(true);
    const ok = await renameCategory(oldName, to);
    setBusy(false);
    onToast(ok ? "Renombrada ✓" : "Guardado (verificá)");
    await refresh();
    onChanged();
  };

  const remove = async (name: string) => {
    if (!window.confirm(`¿Borrar la categoría "${name}"?`)) return;
    setBusy(true);
    const ok = await deleteCategory(name);
    setBusy(false);
    onToast(ok ? "Borrada ✓" : "Guardado (verificá)");
    await refresh();
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-page p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-primary">Categorías</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-page-soft"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <input
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
            }}
            placeholder="Nueva categoría"
            className="input h-11 flex-1 text-base"
          />
          <button
            onClick={add}
            disabled={busy || !nueva.trim()}
            className="btn btn-primary btn-md shrink-0"
          >
            <PlusIcon className="h-5 w-5" /> Agregar
          </button>
        </div>

        <ul className="space-y-2">
          {categories.map((c) => (
            <li
              key={c.slug}
              className="flex items-center gap-2 rounded-xl border border-line bg-white p-3"
            >
              {editing === c.slug ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveRename(c.name);
                    }}
                    autoFocus
                    className="input h-10 flex-1 text-base"
                  />
                  <button
                    onClick={() => saveRename(c.name)}
                    aria-label="Guardar"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-white"
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditing(c.slug);
                      setEditName(c.name);
                    }}
                    className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-ink"
                  >
                    {c.name}
                  </button>
                  <button
                    onClick={() => remove(c.name)}
                    aria-label="Borrar"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sale hover:bg-sale/10"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-4 text-xs text-muted">
          Tocá una categoría para renombrarla. Al renombrar, los productos de esa
          categoría se actualizan solos.
        </p>
      </div>
    </div>
  );
}
