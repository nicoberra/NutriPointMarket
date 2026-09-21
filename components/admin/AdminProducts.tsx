"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { fetchProducts, saveProduct } from "@/lib/api";
import { formatPrice, discountPercent } from "@/lib/format";
import { brandName } from "@/data/brands";
import { categories, categoryMap } from "@/data/categories";
import {
  SearchIcon,
  CloseIcon,
  CheckIcon,
} from "@/components/Icons";

/** Gestión de productos del CRM: buscar, filtrar y editar (escribe en la planilla). */
export function AdminProducts({ onToast }: { onToast: (m: string) => void }) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetchProducts()
      .then(setItems)
      .catch(() => onToast("No se pudieron cargar los productos"))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (query) {
        const hay = `${p.name} ${brandName(p.brand)}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [items, q, cat]);

  const handleSave = async (updated: Product) => {
    setSaving(true);
    const ok = await saveProduct(updated);
    setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setSaving(false);
    setEditing(null);
    onToast(ok ? "Producto guardado ✓" : "Guardado (verificá la planilla)");
  };

  return (
    <div className="space-y-4">
      {/* Buscar */}
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar producto o marca"
          className="input h-11 pl-9 text-base"
        />
      </div>

      {/* Chips de categoría */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Chip active={cat === ""} onClick={() => setCat("")}>
          Todas
        </Chip>
        {categories.map((c) => (
          <Chip key={c.slug} active={cat === c.slug} onClick={() => setCat(c.slug)}>
            {c.name}
          </Chip>
        ))}
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-muted">Cargando productos…</p>
      ) : (
        <>
          <p className="text-xs text-muted">{filtered.length} productos</p>
          <ul className="space-y-2">
            {filtered.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => setEditing(p)}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-white p-3 text-left transition-colors active:bg-page-soft"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase text-muted">
                      {brandName(p.brand)} · {categoryMap[p.category]?.name}
                    </p>
                    <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                    <p className="mt-0.5 text-sm">
                      <span className="font-bold text-primary">{formatPrice(p.price)}</span>{" "}
                      <span
                        className={`ml-1 text-xs font-semibold ${
                          p.stock > 5 ? "text-muted" : "text-sale"
                        }`}
                      >
                        · stock {p.stock}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    {p.discount > 0 && (
                      <span className="badge bg-sale/10 text-sale">{p.discount}%</span>
                    )}
                    {p.featured && (
                      <span className="badge bg-accent-soft text-primary">★</span>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing && (
        <EditProductSheet
          product={editing}
          saving={saving}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-white"
          : "border-line bg-white text-muted"
      }`}
    >
      {children}
    </button>
  );
}

/** Hoja inferior para editar un producto. */
function EditProductSheet({
  product,
  saving,
  onClose,
  onSave,
}: {
  product: Product;
  saving: boolean;
  onClose: () => void;
  onSave: (p: Product) => void;
}) {
  const [form, setForm] = useState<Product>({ ...product });

  const set = <K extends keyof Product>(key: K, value: Product[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Recalcular descuento automáticamente si hay precio anterior
  const autoDiscount = discountPercent(form.price, form.oldPrice);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-page p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase text-muted">
              {brandName(form.brand)}
            </p>
            <h3 className="font-display text-lg font-bold text-primary">{form.name}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink hover:bg-page-soft"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio">
            <input
              type="number"
              inputMode="numeric"
              value={form.price || ""}
              onChange={(e) => set("price", Number(e.target.value))}
              className="input h-11 text-base"
            />
          </Field>
          <Field label="Precio anterior">
            <input
              type="number"
              inputMode="numeric"
              value={form.oldPrice ?? ""}
              onChange={(e) =>
                set("oldPrice", e.target.value ? Number(e.target.value) : undefined)
              }
              className="input h-11 text-base"
            />
          </Field>
          <Field label={`Descuento % (auto: ${autoDiscount}%)`}>
            <input
              type="number"
              inputMode="numeric"
              value={form.discount || ""}
              onChange={(e) => set("discount", Number(e.target.value))}
              className="input h-11 text-base"
            />
          </Field>
          <Field label="Stock">
            <input
              type="number"
              inputMode="numeric"
              value={form.stock || ""}
              onChange={(e) => set("stock", Number(e.target.value))}
              className="input h-11 text-base"
            />
          </Field>
        </div>

        <div className="mt-3">
          <Field label="Sabores (separados por coma)">
            <input
              value={form.flavors.join(", ")}
              onChange={(e) =>
                set(
                  "flavors",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                )
              }
              className="input h-11 text-base"
              placeholder="Vainilla, Chocolate…"
            />
          </Field>
        </div>

        {/* Toggles */}
        <div className="mt-4 space-y-2">
          <Toggle
            label="Destacado"
            checked={form.featured}
            onChange={(v) => set("featured", v)}
          />
          <Toggle
            label="Más vendido"
            checked={form.bestSeller}
            onChange={(v) => set("bestSeller", v)}
          />
          <Toggle
            label="Envío gratis"
            checked={form.freeShipping}
            onChange={(v) => set("freeShipping", v)}
          />
          <Toggle label="Nuevo" checked={!!form.isNew} onChange={(v) => set("isNew", v)} />
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="btn btn-outline btn-md flex-1">
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={saving}
            className="btn btn-primary btn-md flex-1"
          >
            {saving ? "Guardando…" : (
              <>
                <CheckIcon className="h-4.5 w-4.5" /> Guardar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border border-line bg-white px-4 py-2.5"
    >
      <span className="text-sm font-medium text-ink">{label}</span>
      <span
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}
