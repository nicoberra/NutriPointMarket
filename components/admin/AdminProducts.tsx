"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { useProducts } from "@/context/ProductsContext";
import { useCategories } from "@/context/CategoriesContext";
import { saveProduct, type ProductInput } from "@/lib/api";
import { formatPrice, discountPercent } from "@/lib/format";
import { categoryMap } from "@/data/categories";
import { SearchIcon, CloseIcon, CheckIcon, PlusIcon } from "@/components/Icons";
import { AdminCategories } from "./AdminCategories";

/**
 * CRM · Productos. Cada producto es una tarjeta que se edita EN EL LUGAR:
 * precio, precio ML (oferta/tachado), stock y destacado se guardan al toque.
 * El resto (nombre, marca, categoría, variantes) se edita con "Editar".
 * Se muestran agrupados por categoría.
 */

type Changes = Partial<{
  precio: number;
  precioML: number | undefined;
  stock: boolean;
  destacado: boolean;
  costo: number;
  costoMoneda: "USD" | "ARS";
}>;

export function AdminProducts({ onToast }: { onToast: (m: string) => void }) {
  const { products, refresh } = useProducts();
  const { categories } = useCategories();
  const dollar = useDollar();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCats, setShowCats] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (query && !`${p.name} ${p.brand}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [products, q, cat]);

  // Guardado inline (precio, precioML, stock, destacado). Cruza por nombre y
  // conserva marca/categoría/variantes del producto.
  const saveInline = async (p: Product, ch: Changes) => {
    const row: ProductInput = {
      nombre: p.name,
      marca: p.brand,
      categoria: categoryMap[p.category]?.name ?? "",
      precio: ch.precio ?? p.price,
      precioML: "precioML" in ch ? ch.precioML : p.oldPrice,
      variantes: p.flavors.join(", "),
      stock: ch.stock ?? p.inStock !== false,
      destacado: ch.destacado ?? p.featured,
      costo: "costo" in ch ? ch.costo : p.cost,
      costoMoneda: ch.costoMoneda ?? p.costCurrency ?? "ARS",
    };
    const ok = await saveProduct(row);
    onToast(ok ? "Guardado ✓" : "Guardado (verificá)");
    setTimeout(() => refresh().catch(() => {}), 1000);
  };

  const handleFullSave = async (row: ProductInput) => {
    setSaving(true);
    const ok = await saveProduct(row);
    setSaving(false);
    setEditing(null);
    setAdding(false);
    onToast(ok ? "Producto guardado ✓" : "Guardado (verificá la planilla)");
    setTimeout(() => refresh().catch(() => {}), 1200);
  };

  // Grupos por categoría (solo cuando el filtro es "Todas").
  const groups =
    cat === ""
      ? categories
          .map((c) => ({ cat: c, list: filtered.filter((p) => p.category === c.slug) }))
          .filter((g) => g.list.length > 0)
      : [{ cat: categoryMap[cat], list: filtered }];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center">
        <div className="flex gap-2 sm:shrink-0">
          <button
            onClick={() => setShowCats(true)}
            className="btn btn-outline btn-md flex-1 sm:flex-none"
          >
            Categorías
          </button>
          <button
            onClick={() => setAdding(true)}
            className="btn btn-primary btn-md flex-1 sm:flex-none"
          >
            <PlusIcon className="h-5 w-5" /> Agregar
          </button>
        </div>
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar producto o marca"
            className="input h-11 pl-9 text-base"
          />
        </div>
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

      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white py-12 text-center text-sm text-muted">
          Todavía no hay productos. Tocá “Agregar producto”.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white py-12 text-center text-sm text-muted">
          No hay productos para esa búsqueda.
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.cat?.slug ?? "otros"}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
              {g.cat?.name ?? "Otros"}
              <span className="text-xs font-normal text-muted">({g.list.length})</span>
            </h3>
            <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0 xl:grid-cols-3">
              {g.list.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  dollar={dollar}
                  onSave={saveInline}
                  onEdit={() => setEditing(p)}
                />
              ))}
            </div>
          </section>
        ))
      )}

      {(editing || adding) && (
        <ProductSheet
          product={editing}
          saving={saving}
          dollar={dollar}
          onClose={() => {
            setEditing(null);
            setAdding(false);
          }}
          onSave={handleFullSave}
        />
      )}

      {showCats && (
        <AdminCategories
          onClose={() => setShowCats(false)}
          onToast={onToast}
          onChanged={() => refresh().catch(() => {})}
        />
      )}
    </div>
  );
}

/* ------------------------- Tarjeta editable inline ------------------------ */

function ProductRow({
  product,
  dollar,
  onSave,
  onEdit,
}: {
  product: Product;
  dollar: number;
  onSave: (p: Product, ch: Changes) => void;
  onEdit: () => void;
}) {
  const [precio, setPrecio] = useState<number>(product.price);
  const [precioML, setPrecioML] = useState<number | "">(product.oldPrice ?? "");
  const [stock, setStock] = useState<boolean>(product.inStock !== false);
  const [destacado, setDestacado] = useState<boolean>(product.featured);
  const [costo, setCosto] = useState<number | "">(product.cost || "");
  const [moneda, setMoneda] = useState<"USD" | "ARS">(product.costCurrency ?? "ARS");

  const desc = discountPercent(precio, precioML ? Number(precioML) : undefined);
  const costoNum = costo === "" ? 0 : Number(costo);
  const costoPesos = costToPesos(costoNum, moneda, dollar);
  const ganancia = precio - costoPesos;
  const margen = precio > 0 ? Math.round((ganancia / precio) * 100) : 0;

  const saveCosto = (m = moneda) => onSave(product, { costo: costoNum, costoMoneda: m });

  const savePrices = () => {
    const mlNum = precioML === "" ? undefined : Number(precioML);
    if (precio === product.price && (product.oldPrice ?? undefined) === mlNum) return;
    onSave(product, { precio, precioML: mlNum });
  };

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase text-muted">
            {product.brand || "—"}
          </p>
          <p className="font-semibold text-ink">{product.name}</p>
        </div>
        <button
          onClick={onEdit}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-page-soft"
        >
          Editar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink">Precio</span>
          <input
            type="number"
            inputMode="numeric"
            value={precio || ""}
            onChange={(e) => setPrecio(Number(e.target.value))}
            onBlur={savePrices}
            className="input h-11 text-base"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink">
            Precio ML (oferta)
          </span>
          <input
            type="number"
            inputMode="numeric"
            value={precioML}
            onChange={(e) => setPrecioML(e.target.value ? Number(e.target.value) : "")}
            onBlur={savePrices}
            className="input h-11 text-base"
          />
        </label>
      </div>

      <p className="mt-1.5 text-xs text-muted">
        {desc > 0 ? (
          <span className="font-semibold text-sale">{desc}% OFF</span>
        ) : (
          "Sin oferta"
        )}
      </p>

      {/* Costo + moneda + ganancia */}
      <div className="mt-3 rounded-lg bg-page-soft p-3">
        <div className="flex items-end gap-2">
          <label className="block flex-1">
            <span className="mb-1 block text-xs font-semibold text-ink">Costo</span>
            <input
              type="number"
              inputMode="numeric"
              value={costo}
              onChange={(e) => setCosto(e.target.value ? Number(e.target.value) : "")}
              onBlur={() => saveCosto()}
              className="input h-11 text-base"
            />
          </label>
          <div className="flex overflow-hidden rounded-lg border border-line">
            {(["ARS", "USD"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMoneda(m);
                  saveCosto(m);
                }}
                className={`px-3 py-2.5 text-sm font-bold transition-colors ${
                  moneda === m ? "bg-primary text-white" : "bg-white text-muted"
                }`}
              >
                {m === "ARS" ? "$" : "US$"}
              </button>
            ))}
          </div>
        </div>
        {costoNum > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {moneda === "USD" && dollar > 0 && (
              <span className="text-muted">
                ≈ {formatPrice(Math.round(costoPesos))} <span className="opacity-70">(dólar ${dollar})</span>
              </span>
            )}
            {precio > 0 && costoPesos < precio && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 font-bold text-green-700">
                Ganancia {formatPrice(Math.round(ganancia))} · {margen}%
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <Toggle
          label="En stock"
          checked={stock}
          color="green"
          onChange={(v) => {
            setStock(v);
            onSave(product, { stock: v });
          }}
        />
        <Toggle
          label="Destacado"
          checked={destacado}
          color="accent"
          onChange={(v) => {
            setDestacado(v);
            onSave(product, { destacado: v });
          }}
        />
      </div>
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

/** Alta/edición completa de producto (nombre, marca, categoría, variantes). */
function ProductSheet({
  product,
  saving,
  dollar,
  onClose,
  onSave,
}: {
  product: Product | null;
  saving: boolean;
  dollar: number;
  onClose: () => void;
  onSave: (row: ProductInput) => void;
}) {
  const { categories } = useCategories();
  const isEdit = !!product;
  const [nombre, setNombre] = useState(product?.name ?? "");
  const [marca, setMarca] = useState(product?.brand ?? "");
  const [categoria, setCategoria] = useState<string>(
    product
      ? categoryMap[product.category]?.name ?? categories[0]?.name ?? ""
      : categories[0]?.name ?? "",
  );
  const [precio, setPrecio] = useState<number>(product?.price ?? 0);
  const [precioML, setPrecioML] = useState<number | "">(product?.oldPrice ?? "");
  const [variantes, setVariantes] = useState(product?.flavors.join(", ") ?? "");
  const [stock, setStock] = useState<boolean>(product?.inStock !== false);
  const [destacado, setDestacado] = useState<boolean>(product?.featured ?? false);
  const [costo, setCosto] = useState<number | "">(product?.cost || "");
  const [moneda, setMoneda] = useState<"USD" | "ARS">(product?.costCurrency ?? "ARS");

  const desc = discountPercent(precio, precioML ? Number(precioML) : undefined);
  const costoNum = costo === "" ? 0 : Number(costo);
  const costoPesos = costToPesos(costoNum, moneda, dollar);
  const ganancia = precio - costoPesos;

  const submit = () => {
    if (!nombre.trim()) return;
    onSave({
      nombre: nombre.trim(),
      marca: marca.trim(),
      categoria,
      precio,
      precioML: precioML ? Number(precioML) : undefined,
      variantes: variantes.trim(),
      stock,
      destacado,
      costo: costoNum,
      costoMoneda: moneda,
    });
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-page p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-primary">
            {isEdit ? "Editar producto" : "Agregar producto"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-page-soft"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Nombre del producto">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              readOnly={isEdit}
              className={`input h-11 text-base ${isEdit ? "bg-page-soft text-muted" : ""}`}
              placeholder="Ej: Whey Protein 1 Kg"
            />
          </Field>
          {isEdit && (
            <p className="-mt-1 text-[11px] text-muted">
              El nombre es la clave; no se puede cambiar desde acá.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Marca">
              <input
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                className="input h-11 text-base"
                placeholder="Ej: ENA"
              />
            </Field>
            <Field label="Categoría">
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="input h-11 text-base"
              >
                {categories.map((c) => (
                  <option key={c.slug} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Precio">
              <input
                type="number"
                inputMode="numeric"
                value={precio || ""}
                onChange={(e) => setPrecio(Number(e.target.value))}
                className="input h-11 text-base"
              />
            </Field>
            <Field label="Precio ML (tachado)">
              <input
                type="number"
                inputMode="numeric"
                value={precioML}
                onChange={(e) => setPrecioML(e.target.value ? Number(e.target.value) : "")}
                className="input h-11 text-base"
              />
            </Field>
          </div>

          <Field label="Variantes / sabores (separados por coma)">
            <input
              value={variantes}
              onChange={(e) => setVariantes(e.target.value)}
              className="input h-11 text-base"
              placeholder="Vainilla, Chocolate, Frutilla"
            />
          </Field>

          <Field label="Costo (para calcular ganancia)">
            <div className="flex items-stretch gap-2">
              <input
                type="number"
                inputMode="numeric"
                value={costo}
                onChange={(e) => setCosto(e.target.value ? Number(e.target.value) : "")}
                className="input h-11 flex-1 text-base"
              />
              <div className="flex overflow-hidden rounded-lg border border-line">
                {(["ARS", "USD"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMoneda(m)}
                    className={`px-3 text-sm font-bold transition-colors ${
                      moneda === m ? "bg-primary text-white" : "bg-white text-muted"
                    }`}
                  >
                    {m === "ARS" ? "$" : "US$"}
                  </button>
                ))}
              </div>
            </div>
          </Field>

          {costoNum > 0 && (
            <p className="text-xs">
              {moneda === "USD" && dollar > 0 && (
                <span className="text-muted">
                  ≈ {formatPrice(Math.round(costoPesos))} (dólar ${dollar}) ·{" "}
                </span>
              )}
              {precio > 0 && costoPesos < precio && (
                <span className="font-semibold text-green-600">
                  Ganancia {formatPrice(Math.round(ganancia))} ·{" "}
                  {Math.round((ganancia / precio) * 100)}%
                </span>
              )}
            </p>
          )}

          <p className="text-xs text-muted">
            {desc > 0 ? `Se mostrará ${desc}% OFF` : "Sin descuento"}
          </p>

          <div className="space-y-2">
            <Toggle label="Hay stock" checked={stock} color="green" onChange={setStock} />
            <Toggle label="Destacado" checked={destacado} color="accent" onChange={setDestacado} />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="btn btn-outline btn-md flex-1">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving || !nombre.trim()}
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

/** Cotización del dólar blue (Argentina), en vivo, con caché de 3 h. */
function useDollar(): number {
  const [rate, setRate] = useState<number>(0);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("npm-dollar-blue");
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.rate && Date.now() - d.t < 3 * 3600 * 1000) setRate(d.rate);
      }
    } catch {
      /* ignore */
    }
    fetch("https://dolarapi.com/v1/dolares/blue")
      .then((r) => r.json())
      .then((d) => {
        const v = Number(d?.venta) || 0;
        if (v > 0) {
          setRate(v);
          try {
            localStorage.setItem("npm-dollar-blue", JSON.stringify({ rate: v, t: Date.now() }));
          } catch {
            /* ignore */
          }
        }
      })
      .catch(() => {});
  }, []);
  return rate;
}

/** Convierte un costo a pesos según su moneda. */
function costToPesos(costo: number, moneda: "USD" | "ARS", dollar: number): number {
  return moneda === "USD" ? costo * dollar : costo;
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
  color = "accent",
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  color?: "accent" | "green";
}) {
  const onBg = color === "green" ? "bg-green-500" : "bg-accent";
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border border-line bg-white px-4 py-2.5"
    >
      <span className="text-sm font-medium text-ink">{label}</span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? onBg : "bg-line"
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
