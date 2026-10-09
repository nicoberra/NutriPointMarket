"use client";

import { useState } from "react";
import { useConfirm } from "./useConfirm";
import { CopyLinkButton } from "./CopyLinkButton";
import { useCategories } from "@/context/CategoriesContext";
import {
  addCategory,
  renameCategory,
  deleteCategory,
  uploadCategoryImage,
  deleteCategoryImage,
} from "@/lib/api";
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
  const { confirm, dialog } = useConfirm();

  const add = async () => {
    const name = nueva.trim();
    if (!name || busy) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      onToast("Esa categoría ya existe");
      return;
    }
    // try/finally: si la planilla tarda o falla, el panel NO queda trabado.
    setBusy(true);
    try {
      const ok = await addCategory(name, categories.length + 1);
      setNueva("");
      onToast(ok ? "Categoría agregada ✓" : "No se pudo guardar (reintentá)");
    } catch {
      onToast("Tardó demasiado: verificá si se agregó");
    } finally {
      setBusy(false);
    }
    refresh().catch(() => {});
  };

  const saveRename = async (oldName: string) => {
    const to = editName.trim();
    setEditing(null);
    if (!to || to === oldName || busy) return;
    setBusy(true);
    try {
      const ok = await renameCategory(oldName, to);
      onToast(ok ? "Renombrada ✓" : "No se pudo renombrar (reintentá)");
    } catch {
      onToast("Tardó demasiado: verificá si se renombró");
    } finally {
      setBusy(false);
    }
    refresh().catch(() => {});
    onChanged();
  };

  // Subir a GitHub + escribir la planilla tarda distinto cada vez: refrescamos
  // varias veces para que la foto aparezca sola, sin recargar.
  const refreshLater = (...delays: number[]) =>
    delays.forEach((ms) => setTimeout(() => refresh().catch(() => {}), ms));

  const subirFoto = async (catName: string, file: File) => {
    if (busy) return;
    setBusy(true);
    onToast("Subiendo foto… ⏳");
    try {
      await uploadCategoryImage(catName, file);
      onToast("Foto subida ✓ (aparece en unos segundos)");
      refreshLater(3000, 8000, 15000);
    } catch {
      onToast("No se pudo subir la foto");
    } finally {
      setBusy(false);
    }
  };

  const borrarFoto = async (catName: string) => {
    if (busy) return;
    if (!(await confirm({ title: `¿Quitar la foto de "${catName}"?`, confirmLabel: "Sí, quitar" }))) return;
    setBusy(true);
    onToast("Quitando foto… ⏳");
    try {
      const ok = await deleteCategoryImage(catName);
      onToast(ok ? "Foto quitada ✓" : "No se pudo quitar (reintentá)");
    } catch {
      onToast("Tardó demasiado: verificá si se quitó");
    } finally {
      setBusy(false);
    }
    refreshLater(1000, 5000);
  };

  const remove = async (name: string) => {
    if (busy) return;
    if (
      !(await confirm({
        title: `¿Borrar la categoría "${name}"?`,
        message: "Los productos no se borran, pero quedan sin esta categoría hasta que los edites.",
      }))
    )
      return;
    setBusy(true);
    try {
      const ok = await deleteCategory(name);
      onToast(ok ? "Borrada ✓" : "No se pudo borrar (reintentá)");
    } catch {
      onToast("Tardó demasiado: verificá si se borró");
    } finally {
      setBusy(false);
    }
    refresh().catch(() => {});
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 animate-fade-in bg-black/50 motion-reduce:animate-none" onClick={onClose} />
      {dialog}
      <div className="relative max-h-[92vh] w-full max-w-md animate-section-in overflow-y-auto rounded-t-2xl bg-page p-5 motion-reduce:animate-none sm:rounded-2xl">
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
                  <div className="relative shrink-0">
                    {/* Tocar la foto = cambiarla (sube una nueva y reemplaza) */}
                    <label
                      title={c.image ? "Cambiar foto" : "Subir foto"}
                      className="grid h-11 w-11 cursor-pointer place-items-center overflow-hidden rounded-lg border border-line bg-page-soft"
                    >
                      {c.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.image} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[9px] font-semibold text-muted">Foto</span>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={busy}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) await subirFoto(c.name, file);
                        }}
                      />
                    </label>
                    {c.image && (
                      <button
                        type="button"
                        onClick={() => borrarFoto(c.name)}
                        disabled={busy}
                        aria-label="Quitar foto"
                        className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-sale text-xs font-bold text-white"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setEditing(c.slug);
                      setEditName(c.name);
                    }}
                    className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-ink"
                  >
                    {c.name}
                  </button>
                  <CopyLinkButton
                    url={`https://suplemarket.com.ar/productos/?categoria=${c.slug}`}
                    title="Copiar link de la categoría"
                  />
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
