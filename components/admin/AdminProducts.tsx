"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { useProducts } from "@/context/ProductsContext";
import { saveProduct } from "@/lib/api";
import { formatPrice, discountPercent } from "@/lib/format";
import { brandName } from "@/data/brands";
import { categories, categoryMap } from "@/data/categories";
import { SearchIcon, CloseIcon, CheckIcon } from "@/components/Icons";

/**
 * CRM · Productos. Edita lo que vive en la planilla (Precio, Precio ML, Stock,
 * Destacado). El resto (nombre, categoría, descripción) es del catálogo/código.
 */
export function AdminProducts({ onToast }: { onToast: (m: string) => void }) {
  const { products, refresh } = useProducts();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (query && !`${p.name} ${brandName(p.brand)}`.toLowerCase().includes(query))
        return false;
      return true;
    });
  }, [products, q, cat]);

  const handleSave = async (row: {
    nombre: string;
    precio: number;
    precioML?: number;
    stock: boolean;
    destacado: boolean;
  }) => {
    setSaving(true);
    const ok = await saveProduct(row);
    setSaving(false);
    setEditing(null);
    onToast(ok ? "Precio guardado ✓" : "Guardado (verificá la planilla)");
    // refrescar tras un momento (la escritura es asíncrona)
    setTimeout(() => refresh().catch(() => {}), 1200);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar producto o marca"
          className="input h-11 pl-9 text-base"
        />
      </div>

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
                  <span className="font-bold text-primary">{formatPrice(p.price)}</span>
                  {p.oldPrice && (
                    <span className="ml-1.5 text-xs text-muted line-through">
                      {formatPrice(p.oldPrice)}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {p.inStock === false ? (
                  <span className="badge bg-sale/10 text-sale">Sin stock</span>
                ) : (
                  <span className="badge bg-accent-soft text-primary">En stock</span>
                )}
                {p.featured && <span className="badge bg-amber-100 text-amber-700">★</span>}
              </div>
            </button>
          </li>
        ))}
      </ul>

      {editing && (
        <EditPriceSheet
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
        active ? "border-primary bg-primary text-white" : "border-line bg-white text-muted"
      }`}
    >
      {children}
    </button>
  );
}

function EditPriceSheet({
  product,
  saving,
  onClose,
  onSave,
}: {
  product: Product;
  saving: boolean;
  onClose: () => void;
  onSave: (row: {
    nombre: string;
    precio: number;
    precioML?: number;
    stock: boolean;
    destacado: boolean;
  }) => void;
}) {
  const [precio, setPrecio] = useState<number>(product.price);
  const [precioML, setPrecioML] = useState<number | "">(product.oldPrice ?? "");
  const [stock, setStock] = useState<boolean>(product.inStock !== false);
  const [destacado, setDestacado] = useState<boolean>(product.featured);

  const desc = discountPercent(precio, precioML ? Number(precioML) : undefined);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-page p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase text-muted">
              {brandName(product.brand)}
            </p>
            <h3 className="font-display text-lg font-bold text-primary">{product.name}</h3>
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
              value={precio || ""}
              onChange={(e) => setPrecio(Number(e.target.value))}
              className="input h-11 text-base"
            />
          </Field>
          <Field label={`Precio ML (tachado)`}>
            <input
              type="number"
              inputMode="numeric"
              value={precioML}
              onChange={(e) => setPrecioML(e.target.value ? Number(e.target.value) : "")}
              className="input h-11 text-base"
            />
          </Field>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          {desc > 0
            ? `Se mostrará ${desc}% OFF`
            : "Sin descuento (dejá Precio ML vacío o menor al precio)"}
        </p>

        <div className="mt-4 space-y-2">
          <Toggle label="Hay stock" checked={stock} onChange={setStock} />
          <Toggle label="Destacado" checked={destacado} onChange={setDestacado} />
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="btn btn-outline btn-md flex-1">
            Cancelar
          </button>
          <button
            onClick={() =>
              onSave({
                nombre: product.name,
                precio,
                precioML: precioML ? Number(precioML) : undefined,
                stock,
                destacado,
              })
            }
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
