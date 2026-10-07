"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConfirm } from "./useConfirm";
import { ComboBreakdown } from "./ComboBreakdown";
import type { Product } from "@/lib/types";
import { useProducts } from "@/context/ProductsContext";
import { useCategories } from "@/context/CategoriesContext";
import {
  saveProduct,
  uploadProductImage,
  deleteProductImage,
  deleteRow,
  type ProductInput,
} from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { listPrice } from "@/lib/config";
import { categoryMap } from "@/data/categories";
import { SearchIcon, CloseIcon, CheckIcon, PlusIcon, TrashIcon, ChevronDownIcon } from "@/components/Icons";
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
  cantidad: number;
  variantes: string;
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
  const { confirm, dialog } = useConfirm();

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
      // La planilla guarda el precio CON transferencia (base), no el publicado.
      precio: ch.precio ?? p.basePrice ?? p.price,
      precioML: "precioML" in ch ? ch.precioML : p.baseOldPrice,
      // Conserva el stock por variante ("Rojo:3"), no solo los nombres.
      variantes:
        ch.variantes ??
        (p.variants && p.variants.length
          ? p.variants.map((v) => (v.qty == null ? v.name : `${v.name}:${v.qty}`)).join(", ")
          : p.flavors.join(", ")),
      stock: ch.stock ?? p.inStock !== false,
      destacado: ch.destacado ?? p.featured,
      // Si el costo no está cargado en memoria (0), se manda "" para que la
      // planilla conserve el que tiene (nunca se pisa con 0 por accidente).
      costo: "costo" in ch ? ch.costo : (p.cost ?? 0) > 0 ? p.cost : "",
      costoMoneda: ch.costoMoneda ?? ((p.cost ?? 0) > 0 ? (p.costCurrency ?? "ARS") : ""),
      cantidad: ch.cantidad ?? p.stockQty ?? 0,
      descripcion: p.description ?? "",
      modoUso: p.usage ?? "",
      infoNutricional: p.nutrition ?? "",
      ingredientes: p.ingredients ?? "",
      combo: p.combo && p.combo.length ? JSON.stringify(p.combo) : "",
    };
    try {
      const ok = await saveProduct(row);
      onToast(ok ? "Guardado ✓" : "No se pudo guardar (reintentá)");
    } catch {
      onToast("Tardó demasiado: verificá si se guardó");
    }
    setTimeout(() => refresh().catch(() => {}), 1000);
  };

  // Sube la foto de un producto (o de una variante) a GitHub y refresca.
  // Refresca varias veces: subir a GitHub y escribir la planilla tarda
  // distinto cada vez; así la foto aparece sola sin tener que recargar.
  const refreshLater = (...delays: number[]) =>
    delays.forEach((ms) => setTimeout(() => refresh().catch(() => {}), ms));

  const handleUpload = async (p: Product, file: File, variante?: string) => {
    onToast("Subiendo foto… ⏳");
    try {
      await uploadProductImage(p.name, file, variante);
      onToast("Foto subida ✓ (aparece en unos segundos)");
      refreshLater(3000, 8000, 15000);
    } catch {
      onToast("No se pudo subir la foto");
    }
  };

  const handleDeleteImage = async (p: Product, opts: { url?: string; variante?: string }) => {
    onToast("Eliminando foto… ⏳");
    try {
      const ok = await deleteProductImage(p.name, opts);
      onToast(ok ? "Foto eliminada ✓" : "No se pudo eliminar (reintentá)");
    } catch {
      // Si tardó más de la cuenta, puede que igual se haya borrado: refrescamos.
      onToast("Tardó demasiado: verificá si se borró");
    }
    refreshLater(1500, 6000);
  };

  // Guardado optimista: cierra al toque y guarda en segundo plano (se siente
  // instantáneo). Igual avisa cuando terminó de guardar.
  const handleFullSave = async (row: ProductInput) => {
    setEditing(null);
    setAdding(false);
    onToast("Guardando…");
    try {
      const ok = await saveProduct(row);
      onToast(ok ? "Guardado ✓" : "No se pudo guardar (reintentá)");
    } catch {
      onToast("Tardó demasiado: verificá si se guardó");
    }
    refreshLater(800, 5000);
  };

  const handleDelete = async (p: Product) => {
    if (
      !(await confirm({
        title: `¿Eliminar "${p.name}"?`,
        message: "Se borra de la planilla y de la tienda. No se puede deshacer.",
      }))
    )
      return;
    onToast("Eliminando…");
    try {
      await deleteRow("Productos", p.name);
      onToast("Producto eliminado ✓");
    } catch {
      onToast("Tardó demasiado: verificá si se eliminó");
    }
    refreshLater(800, 5000);
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
                  onUpload={handleUpload}
                  onDeleteImage={handleDeleteImage}
                  onDelete={handleDelete}
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

      {dialog}
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
  onUpload,
  onDeleteImage,
  onDelete,
}: {
  product: Product;
  dollar: number;
  onSave: (p: Product, ch: Changes) => void;
  onEdit: () => void;
  onUpload: (p: Product, file: File, variante?: string) => Promise<void>;
  onDeleteImage: (p: Product, opts: { url?: string; variante?: string }) => Promise<void>;
  onDelete: (p: Product) => void;
}) {
  const [uploading, setUploading] = useState(false);
  // "Foto por variante" arranca plegado (muestra 2); tocar el título abre todo.
  const [varsOpen, setVarsOpen] = useState(false);
  const [precioNormal, setPrecioNormal] = useState<number>(
    product.baseOldPrice && product.baseOldPrice > (product.basePrice ?? product.price) ? product.baseOldPrice : (product.basePrice ?? product.price),
  );
  const [descMode, setDescMode] = useState<"$" | "%">("$");
  const [descVal, setDescVal] = useState<number | "">(
    product.baseOldPrice && product.baseOldPrice > (product.basePrice ?? product.price) ? product.baseOldPrice - (product.basePrice ?? product.price) : "",
  );
  const [destacado, setDestacado] = useState<boolean>(product.featured);
  const [costo, setCosto] = useState<number | "">(product.cost || "");
  const [moneda, setMoneda] = useState<"USD" | "ARS">(product.costCurrency ?? "ARS");
  // El costo llega recién con el token (1-2 s después de pintar desde el
  // caché): cuando cambia en los datos, se refleja en el campo.
  useEffect(() => {
    setCosto(product.cost || "");
    setMoneda(product.costCurrency ?? "ARS");
  }, [product.cost, product.costCurrency]);
  const [cantidad, setCantidad] = useState<number | "">(product.stockQty ?? "");
  const hasVars = !!(product.variants && product.variants.length);
  // Combos: detalle fijo (cada producto con costo y precio, sumas, ganancia).
  const isComboRow = !!(product.combo && product.combo.length);
  const { products: allForCombo } = useProducts();
  const [varQty, setVarQty] = useState<Record<string, string>>(
    Object.fromEntries(
      (product.variants ?? []).map((v) => [v.name, v.qty == null ? "" : String(v.qty)]),
    ),
  );
  const saveVarStockWith = (map: Record<string, string>) => {
    const vars = (product.variants ?? []).map((v) => {
      const q = map[v.name];
      return q === undefined || q === "" ? v.name : `${v.name}:${Number(q) || 0}`;
    });
    const total = (product.variants ?? []).reduce((a, v) => {
      const q = map[v.name];
      return a + (q === undefined || q === "" ? 0 : Number(q) || 0);
    }, 0);
    onSave(product, { variantes: vars.join(", "), cantidad: total, stock: total > 0 });
  };
  const saveVarStock = () => saveVarStockWith(varQty);
  // Botones − / + para ajustar rápido (ventas por fuera de la web): guarda
  // solo, con una pausa corta para no mandar un pedido por cada toque.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bumpVar = (name: string, d: number) => {
    const next = { ...varQty, [name]: String(Math.max(0, (Number(varQty[name]) || 0) + d)) };
    setVarQty(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveVarStockWith(next), 600);
  };

  const descValNum = descVal === "" ? 0 : Number(descVal);
  const descPesos = descMode === "%" ? Math.round((precioNormal * descValNum) / 100) : descValNum;
  const descPorc = precioNormal > 0 ? Math.round((descPesos / precioNormal) * 100) : 0;
  const precioFinal = Math.max(0, precioNormal - descPesos);
  const costoNum = costo === "" ? 0 : Number(costo);
  const costoPesos = costToPesos(costoNum, moneda, dollar);
  const ganancia = precioFinal - costoPesos;
  const margen = precioFinal > 0 ? Math.round((ganancia / precioFinal) * 100) : 0;

  const saveCosto = (m = moneda) =>
    onSave(product, costo === "" ? { costoMoneda: m } : { costo: costoNum, costoMoneda: m });

  const savePrices = () => {
    onSave(product, { precio: precioFinal, precioML: descPesos > 0 ? precioNormal : undefined });
  };

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase text-muted">
            {product.brand || "—"}
          </p>
          {/* Tocar el nombre también abre el editor */}
          <button
            type="button"
            onClick={onEdit}
            title="Editar producto"
            className="text-left font-semibold text-ink transition-colors hover:text-primary hover:underline"
          >
            {product.name}
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onEdit}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-page-soft"
          >
            Editar
          </button>
          <button
            onClick={() => onDelete(product)}
            aria-label="Eliminar producto"
            className="grid h-7 w-7 place-items-center rounded-lg text-sale hover:bg-sale/10"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Fotos del producto (galería) */}
      <div className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {(product.images ?? []).map((src) => (
            <div key={src} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-14 w-14 rounded-lg border border-line object-cover" />
              <button
                type="button"
                onClick={() => onDeleteImage(product, { url: src })}
                aria-label="Eliminar foto"
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-sale text-xs font-bold text-white"
              >
                ×
              </button>
            </div>
          ))}
          <label className="grid h-14 w-14 cursor-pointer place-items-center rounded-lg border border-dashed border-line text-[10px] font-semibold text-primary hover:bg-page-soft">
            {uploading ? "…" : "+ Foto"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setUploading(true);
                await onUpload(product, file);
                setUploading(false);
              }}
            />
          </label>
        </div>

        {/* Foto por variante */}
        {product.flavors.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <button
              type="button"
              onClick={() => setVarsOpen((o) => !o)}
              aria-expanded={varsOpen}
              className="flex w-full items-center justify-between rounded-lg py-1 text-left text-[11px] font-semibold text-muted transition-colors hover:text-primary"
            >
              <span>
                Foto por variante{" "}
                <span className="font-normal">({product.flavors.length})</span>
              </span>
              <ChevronDownIcon
                className={`h-4 w-4 transition-transform ${varsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {(varsOpen ? product.flavors : product.flavors.slice(0, 2)).map((f) => {
              const vimgs = product.variantImages?.[f] ?? [];
              return (
                <div key={f} className="rounded-lg border border-line p-2">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-ink">{f}</span>
                    <label className="cursor-pointer rounded border border-line px-2 py-1 text-[11px] font-semibold text-primary hover:bg-page-soft">
                      + Foto
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (!file) return;
                          setUploading(true);
                          await onUpload(product, file, f);
                          setUploading(false);
                        }}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {vimgs.map((src) => (
                      <div key={src} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-9 w-9 rounded border border-line object-cover" />
                        <button
                          type="button"
                          onClick={() => onDeleteImage(product, { variante: f, url: src })}
                          aria-label="Quitar foto"
                          className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-sale text-[9px] font-bold text-white"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {vimgs.length === 0 && (
                      <span className="text-[10px] text-muted">Sin fotos</span>
                    )}
                  </div>
                </div>
              );
            })}
            {product.flavors.length > 2 && (
              <button
                type="button"
                onClick={() => setVarsOpen((o) => !o)}
                className="w-full rounded-lg border border-dashed border-line py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-page-soft"
              >
                {varsOpen ? "Ver menos ▲" : `Ver las ${product.flavors.length} variantes ▼`}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-[1fr_1.35fr] gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink">Precio con transferencia</span>
          <input
            type="number"
            inputMode="numeric"
            value={precioNormal || ""}
            onChange={(e) => setPrecioNormal(Number(e.target.value))}
            onBlur={savePrices}
            className="input h-11 text-base"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink">Descuento <span className="font-normal text-muted">(se resta)</span></span>
          <div className="flex items-stretch gap-1.5">
            <input
              type="number"
              inputMode="numeric"
              value={descVal}
              onChange={(e) => setDescVal(e.target.value === "" ? "" : Number(e.target.value))}
              onBlur={savePrices}
              className="input h-11 min-w-0 flex-1 px-3 text-base"
              placeholder="0"
            />
            <div className="flex overflow-hidden rounded-lg border border-line">
              {(["$", "%"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setDescMode(m);
                    setTimeout(savePrices, 0);
                  }}
                  className={`px-2 text-xs font-bold transition-colors ${
                    descMode === m ? "bg-primary text-white" : "bg-white text-muted"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </label>
      </div>

      {/* Precio final bien visible: es lo que paga el cliente en la tienda */}
      <div
        className={`mt-2 flex items-center justify-between gap-3 rounded-lg px-3 py-2 ${
          descPorc >= 50 ? "bg-sale/10" : "bg-accent-soft"
        }`}
      >
        <span className="text-xs font-semibold text-ink">
          Precio final con transferencia
          <span className="block font-normal text-muted">
            en la web: {formatPrice(listPrice(precioFinal))} (sin transferencia)
          </span>
        </span>
        <span className="text-right">
          <span className={`font-display text-xl font-black ${descPorc >= 50 ? "text-sale" : "text-primary"}`}>
            {formatPrice(precioFinal)}
          </span>
          <span className="block text-[11px] font-semibold text-muted">
            {descPesos > 0 ? `${descPorc}% OFF · ahorra ${formatPrice(descPesos)}` : "Sin descuento"}
            {descPorc >= 50 ? " · ¿seguro?" : ""}
          </span>
        </span>
      </div>

      {/* Costo: en combos, detalle fijo por producto; si no, costo editable */}
      {isComboRow ? (
        <ComboBreakdown product={product} all={allForCombo} dollar={dollar} toPesos={costToPesos} />
      ) : (
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
            {precioFinal > 0 && costoPesos < precioFinal && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 font-bold text-green-700">
                Ganancia {formatPrice(Math.round(ganancia))} · {margen}%
              </span>
            )}
          </div>
        )}
      </div>
      )}

      {isComboRow ? (
        <p className="mt-3 rounded-lg border border-dashed border-line bg-white px-3 py-2 text-xs text-muted">
          Stock disponible según sus productos:{" "}
          <b className="text-ink">{product.stockQty ?? 0}</b> (al vender se descuenta de cada
          producto)
        </p>
      ) : hasVars ? (
        <div className="mt-3">
          <span className="mb-1 block text-xs font-semibold text-ink">
            Stock por variante{" "}
            <span className="font-normal text-muted">(total: {product.stockQty ?? 0})</span>
          </span>
          <div className="space-y-1.5">
            {(product.variants ?? []).map((v) => (
              <div key={v.name} className="flex items-center gap-1.5">
                <span className="flex-1 truncate text-sm text-ink">{v.name}</span>
                <button
                  type="button"
                  onClick={() => bumpVar(v.name, -1)}
                  aria-label={`Restar 1 a ${v.name}`}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line text-lg font-bold text-primary active:bg-page-soft"
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={varQty[v.name] ?? ""}
                  onChange={(e) =>
                    setVarQty((s) => ({ ...s, [v.name]: e.target.value }))
                  }
                  onBlur={saveVarStock}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className="input h-10 w-16 text-center text-base"
                  placeholder="0"
                />
                <button
                  type="button"
                  onClick={() => bumpVar(v.name, 1)}
                  aria-label={`Sumar 1 a ${v.name}`}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line text-lg font-bold text-primary active:bg-page-soft"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-ink">Cantidad en stock</span>
          <input
            type="number"
            inputMode="numeric"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value === "" ? "" : Number(e.target.value))}
            onBlur={() => {
              const n = cantidad === "" ? 0 : Number(cantidad);
              onSave(product, { cantidad: n, stock: n > 0 });
            }}
            className="input h-11 text-base"
            placeholder="0"
          />
        </label>
      )}

      <div className="mt-3">
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
  const { products: allProducts } = useProducts();
  const isEdit = !!product;
  const [nombre, setNombre] = useState(product?.name ?? "");
  const [comboRows, setComboRows] = useState<{ n: string; q: string }[]>(
    product?.combo ? product.combo.map((c) => ({ n: c.n, q: String(c.q) })) : [],
  );
  const [marca, setMarca] = useState(product?.brand ?? "");
  const [categoria, setCategoria] = useState<string>(
    product
      ? categoryMap[product.category]?.name ?? categories[0]?.name ?? ""
      : categories[0]?.name ?? "",
  );
  // Precio NORMAL + descuento (en $ o %). El precio final = normal − descuento.
  const [precioNormal, setPrecioNormal] = useState<number>(
    product ? (product.baseOldPrice && product.baseOldPrice > (product.basePrice ?? product.price) ? product.baseOldPrice : (product.basePrice ?? product.price)) : 0,
  );
  const [descMode, setDescMode] = useState<"$" | "%">("$");
  const [descVal, setDescVal] = useState<number | "">(
    product && product.baseOldPrice && product.baseOldPrice > (product.basePrice ?? product.price)
      ? product.baseOldPrice - (product.basePrice ?? product.price)
      : "",
  );
  const [variantRows, setVariantRows] = useState<{ name: string; qty: string }[]>(
    product?.variants && product.variants.length
      ? product.variants.map((v) => ({ name: v.name, qty: v.qty == null ? "" : String(v.qty) }))
      : [],
  );
  const [destacado, setDestacado] = useState<boolean>(product?.featured ?? false);
  const [costo, setCosto] = useState<number | "">(product?.cost || "");
  const [moneda, setMoneda] = useState<"USD" | "ARS">(product?.costCurrency ?? "ARS");
  const [cantidad, setCantidad] = useState<number | "">(product?.stockQty ?? "");
  const [descripcion, setDescripcion] = useState(product?.description ?? "");
  const [modoUso, setModoUso] = useState(product?.usage ?? "");
  const [infoNutri, setInfoNutri] = useState(product?.nutrition ?? "");
  const [ingredientes, setIngredientes] = useState(product?.ingredients ?? "");

  const descValNum = descVal === "" ? 0 : Number(descVal);
  const descPesos = descMode === "%" ? Math.round((precioNormal * descValNum) / 100) : descValNum;
  const descPorc = precioNormal > 0 ? Math.round((descPesos / precioNormal) * 100) : 0;
  const precioFinal = Math.max(0, precioNormal - descPesos);
  // Costo del combo: suma del costo (en pesos) de cada producto que lo arma.
  const comboCostDetail = comboRows
    .filter((r) => r.n)
    .map((r) => {
      const pr = allProducts.find((p) => p.name === r.n);
      const q = Number(r.q) || 1;
      const unit = pr ? costToPesos(pr.cost || 0, pr.costCurrency ?? "ARS", dollar) : 0;
      const priceUnit = pr?.basePrice ?? pr?.price ?? 0;
      return { name: r.n, brand: pr?.brand, q, unit, total: unit * q, priceTotal: priceUnit * q };
    });
  const isCombo = comboCostDetail.length > 0;
  const comboCostTotal = comboCostDetail.reduce((a, d) => a + d.total, 0);
  const comboPriceTotal = comboCostDetail.reduce((a, d) => a + d.priceTotal, 0);
  // La marca del combo sale de las marcas de los productos elegidos.
  // Marca del combo: une las marcas distintas (sin repetir por mayúsculas,
  // ej. "Star nutricion" y "Star Nutricion" cuentan como una sola).
  const comboBrand = (() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const b of comboCostDetail.map((d) => (d.brand ?? "").trim()).filter(Boolean)) {
      if (!seen.has(b.toLowerCase())) {
        seen.add(b.toLowerCase());
        out.push(b);
      }
    }
    return out.join(" / ");
  })();
  // Modo de uso / info nutricional / ingredientes: se copian de los productos.
  const comboProducts = comboCostDetail
    .map((d) => allProducts.find((p) => p.name === d.name))
    .filter((p): p is Product => !!p);
  const joinInfo = (get: (p: Product) => string | undefined) =>
    comboProducts
      .map((p) => {
        const v = get(p);
        return v ? `${p.name}:\n${v}` : "";
      })
      .filter(Boolean)
      .join("\n\n");
  const comboUsage = joinInfo((p) => p.usage);
  const comboNutrition = joinInfo((p) => p.nutrition);
  const comboIngredients = joinInfo((p) => p.ingredients);
  const costoNum = costo === "" ? 0 : Number(costo);
  const costoPesos = isCombo ? comboCostTotal : costToPesos(costoNum, moneda, dollar);
  const ganancia = precioFinal - costoPesos;

  // Serializa las variantes a "Rojo:5, Azul:3" (o "Rojo" si no lleva stock).
  const variantesStr = variantRows
    .filter((r) => r.name.trim())
    .map((r) => (r.qty.trim() === "" ? r.name.trim() : `${r.name.trim()}:${Number(r.qty) || 0}`))
    .join(", ");
  const hasVariantStock = variantRows.some((r) => r.name.trim() && r.qty.trim() !== "");
  const variantTotal = variantRows.reduce(
    (a, r) => a + (r.qty.trim() === "" ? 0 : Number(r.qty) || 0),
    0,
  );

  const submit = () => {
    if (!nombre.trim()) return;
    const cantNum = cantidad === "" ? 0 : Number(cantidad);
    // Si las variantes tienen stock, el total sale de la suma de ellas.
    const totalStock = hasVariantStock ? variantTotal : cantNum;
    onSave({
      nombre: nombre.trim(),
      marca: isCombo ? comboBrand : marca.trim(),
      categoria,
      precio: precioFinal,
      precioML: descPesos > 0 ? precioNormal : undefined,
      variantes: isCombo ? "" : variantesStr,
      stock: isCombo ? true : hasVariantStock ? variantTotal > 0 : cantNum > 0,
      destacado,
      costo: isCombo ? (comboCostTotal > 0 ? Math.round(comboCostTotal) : "") : costo === "" ? "" : costoNum,
      costoMoneda: isCombo ? (comboCostTotal > 0 ? "ARS" : "") : costo === "" ? "" : moneda,
      cantidad: isCombo ? 0 : totalStock,
      descripcion: descripcion.trim(),
      modoUso: isCombo ? comboUsage : modoUso.trim(),
      infoNutricional: isCombo ? comboNutrition : infoNutri.trim(),
      ingredientes: isCombo ? comboIngredients : ingredientes.trim(),
      combo: comboRows.filter((r) => r.n).length
        ? JSON.stringify(
            comboRows
              .filter((r) => r.n)
              .map((r) => ({ n: r.n, q: Number(r.q) || 1 })),
          )
        : "",
    });
  };

  // Al salir, si hay nombre, guarda solo (lo que pidió el usuario).
  const closeAndSave = () => {
    if (nombre.trim()) submit();
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 animate-fade-in bg-black/50 motion-reduce:animate-none" onClick={closeAndSave} />
      <div className="relative max-h-[95vh] w-full max-w-md animate-section-in overflow-y-auto rounded-t-2xl bg-page p-5 motion-reduce:animate-none sm:rounded-2xl lg:max-w-4xl lg:p-7">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-primary">
            {isEdit ? "Editar producto" : "Agregar producto"}
          </h3>
          <button
            onClick={closeAndSave}
            aria-label="Cerrar y guardar"
            className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-page-soft"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6 lg:gap-y-3 lg:space-y-0">
          <div className="lg:col-span-2">
            <Field label="Nombre del producto">
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                readOnly={isEdit}
                className={`input h-11 text-base ${isEdit ? "bg-page-soft text-muted" : ""}`}
                placeholder="Ej: Whey Protein 1 Kg"
              />
            </Field>
          </div>
          {isEdit && (
            <p className="-mt-1 text-[11px] text-muted lg:col-span-2">
              El nombre es la clave; no se puede cambiar desde acá.
            </p>
          )}

          {/* Combo */}
          <div className="lg:col-span-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
            <span className="mb-1 block text-xs font-semibold text-ink">
              Combo (opcional) — elegí los productos que lo arman
            </span>
            <p className="mb-2 text-[11px] text-muted">
              Si agregás productos acá, este producto es un <b>combo</b>: al venderse se
              descuenta el stock de cada uno. El stock del combo se calcula solo según lo
              que haya de cada producto.
            </p>
            <div className="space-y-2">
              {comboRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={row.n}
                    onChange={(e) =>
                      setComboRows((rs) =>
                        rs.map((r, j) => (j === i ? { ...r, n: e.target.value } : r)),
                      )
                    }
                    className="input h-11 flex-1 text-base"
                  >
                    <option value="">Elegí un producto…</option>
                    {allProducts
                      .filter((pr) => pr.name !== nombre && !(pr.combo && pr.combo.length))
                      .map((pr) => (
                        <option key={pr.id} value={pr.name}>
                          {pr.brand ? `${pr.brand} · ${pr.name}` : pr.name}
                        </option>
                      ))}
                  </select>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={row.q}
                    onChange={(e) =>
                      setComboRows((rs) =>
                        rs.map((r, j) => (j === i ? { ...r, q: e.target.value } : r)),
                      )
                    }
                    className="input h-11 w-20 text-base"
                    placeholder="Cant."
                  />
                  <button
                    type="button"
                    onClick={() => setComboRows((rs) => rs.filter((_, j) => j !== i))}
                    aria-label="Quitar"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-white"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setComboRows((rs) => [...rs, { n: "", q: "1" }])}
              className="mt-2 text-sm font-semibold text-primary hover:underline"
            >
              + Agregar producto al combo
            </button>

            {comboCostDetail.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-lg border border-primary/20 bg-white text-xs">
                <table className="w-full">
                  <thead>
                    <tr className="bg-page-soft text-[10px] font-bold uppercase tracking-wide text-muted">
                      <th className="px-2 py-1.5 text-left">Producto</th>
                      <th className="px-2 py-1.5 text-right">Costo</th>
                      <th className="px-2 py-1.5 text-right">Precio (transf.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comboCostDetail.map((d, i) => (
                      <tr key={i} className="border-t border-line">
                        <td className="px-2 py-1.5">
                          <span className="font-semibold text-ink">
                            {d.q > 1 ? `${d.q}× ` : ""}
                            {d.name}
                          </span>
                          {d.brand && (
                            <span className="block text-[10px] font-bold uppercase text-primary">
                              {d.brand}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1.5 text-right text-muted">
                          {formatPrice(Math.round(d.total))}
                        </td>
                        <td className="px-2 py-1.5 text-right text-muted">
                          {formatPrice(Math.round(d.priceTotal))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-primary/30 font-bold text-ink">
                      <td className="px-2 py-1.5">Suma</td>
                      <td className="px-2 py-1.5 text-right text-sale">
                        {formatPrice(Math.round(comboCostTotal))}
                      </td>
                      <td className="px-2 py-1.5 text-right text-primary">
                        {formatPrice(Math.round(comboPriceTotal))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
                <div className="flex items-center justify-between border-t border-line bg-accent-soft px-2 py-1.5">
                  <span className="font-semibold text-ink">
                    Precio del combo (transf.)
                    <span className="block text-[10px] font-normal text-muted">
                      vs. {formatPrice(Math.round(comboPriceTotal))} comprando por separado
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="font-display text-base font-black text-primary">
                      {formatPrice(precioFinal)}
                    </span>
                    <span className="block text-[10px] font-semibold text-green-700">
                      ganancia {formatPrice(Math.round(precioFinal - comboCostTotal))}
                    </span>
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:col-span-2">
            <Field label={isCombo ? "Marca (del combo)" : "Marca"}>
              {isCombo ? (
                <input
                  readOnly
                  value={comboBrand || "según los productos"}
                  className="input h-11 bg-page-soft text-base text-muted"
                />
              ) : (
                <input
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  className="input h-11 text-base"
                  placeholder="Ej: ENA"
                />
              )}
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
            <Field label="Precio con transferencia (normal)">
              <input
                type="number"
                inputMode="numeric"
                value={precioNormal || ""}
                onChange={(e) => setPrecioNormal(Number(e.target.value))}
                className="input h-11 text-base"
              />
            </Field>
            <Field label="Descuento (se resta)">
              <div className="flex items-stretch gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={descVal}
                  onChange={(e) => setDescVal(e.target.value === "" ? "" : Number(e.target.value))}
                  className="input h-11 flex-1 text-base"
                  placeholder="0"
                />
                <div className="flex overflow-hidden rounded-lg border border-line">
                  {(["$", "%"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDescMode(m)}
                      className={`px-3 text-sm font-bold transition-colors ${
                        descMode === m ? "bg-primary text-white" : "bg-white text-muted"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </Field>
          </div>

          <Field label="Descripción (se muestra en la página del producto)">
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="input min-h-24 py-2 text-base"
              placeholder="Detalle del producto, beneficios…"
            />
          </Field>

          {!isCombo && (
            <>
              <Field label="Modo de uso (opcional)">
                <textarea
                  value={modoUso}
                  onChange={(e) => setModoUso(e.target.value)}
                  className="input min-h-20 py-2 text-base"
                  placeholder="Cómo se toma / se usa…"
                />
              </Field>

              <Field label="Información nutricional (opcional — si lo dejás vacío no se muestra)">
                <textarea
                  value={infoNutri}
                  onChange={(e) => setInfoNutri(e.target.value)}
                  className="input min-h-20 py-2 text-base"
                  placeholder="Ej: Energía 120 kcal · Proteínas 24 g · Carbohidratos 3 g…"
                />
              </Field>

              <Field label="Ingredientes (opcional — si lo dejás vacío no se muestra)">
                <textarea
                  value={ingredientes}
                  onChange={(e) => setIngredientes(e.target.value)}
                  className="input min-h-20 py-2 text-base"
                  placeholder="Lista de ingredientes…"
                />
              </Field>
            </>
          )}

          {isCombo && (
            <p className="rounded-lg bg-accent-soft px-3 py-2 text-[11px] text-primary lg:col-span-2">
              El <b>modo de uso, la info nutricional y los ingredientes</b> del combo se
              copian solos de los productos que elegiste.
            </p>
          )}

          {isCombo && (
            <p className="rounded-lg bg-page-soft px-3 py-2 text-[11px] text-muted lg:col-span-2">
              Este producto es un <b>combo</b>: no se le carga stock ni variantes. El stock se
              calcula solo según los productos que lo arman.
            </p>
          )}

          {!isCombo && (
          <div className="lg:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-ink">
              Variantes (color / sabor) y stock de cada una
            </span>
            <div className="space-y-2">
              {variantRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={row.name}
                    onChange={(e) =>
                      setVariantRows((rs) =>
                        rs.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)),
                      )
                    }
                    className="input h-11 flex-1 text-base"
                    placeholder="Ej: Rojo"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={row.qty}
                    onChange={(e) =>
                      setVariantRows((rs) =>
                        rs.map((r, j) => (j === i ? { ...r, qty: e.target.value } : r)),
                      )
                    }
                    className="input h-11 w-24 text-base"
                    placeholder="Stock"
                  />
                  <button
                    type="button"
                    onClick={() => setVariantRows((rs) => rs.filter((_, j) => j !== i))}
                    aria-label="Quitar variante"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-page-soft"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setVariantRows((rs) => [...rs, { name: "", qty: "" }])}
              className="mt-2 text-sm font-semibold text-primary hover:underline"
            >
              + Agregar variante
            </button>
            {hasVariantStock && (
              <p className="mt-1 text-[11px] text-muted">
                Stock total (suma de variantes): <b>{variantTotal}</b>
              </p>
            )}
          </div>
          )}

          {!isCombo && !hasVariantStock && (
            <Field label="Cantidad en stock">
              <input
                type="number"
                inputMode="numeric"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value === "" ? "" : Number(e.target.value))}
                className="input h-11 text-base"
                placeholder="0"
              />
            </Field>
          )}

          <Field label="Costo (para calcular ganancia)">
            {isCombo ? (
              <input
                readOnly
                value={`${formatPrice(Math.round(comboCostTotal))} (calculado del combo)`}
                className="input h-11 bg-page-soft text-base text-muted"
              />
            ) : (
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
            )}
          </Field>

          {costoNum > 0 && (
            <p className="text-xs">
              {moneda === "USD" && dollar > 0 && (
                <span className="text-muted">
                  ≈ {formatPrice(Math.round(costoPesos))} (dólar ${dollar}) ·{" "}
                </span>
              )}
              {precioFinal > 0 && costoPesos < precioFinal && (
                <span className="font-semibold text-green-600">
                  Ganancia {formatPrice(Math.round(ganancia))} ·{" "}
                  {Math.round((ganancia / precioFinal) * 100)}%
                </span>
              )}
            </p>
          )}

          <p className="text-xs">
            {descPesos > 0 ? (
              <span className="font-semibold text-secondary">
                Descuento {formatPrice(descPesos)} ({descPorc}%) · Precio final (transf.):{" "}
                {formatPrice(precioFinal)} · En la web: {formatPrice(listPrice(precioFinal))}
              </span>
            ) : (
              <span className="text-muted">Sin descuento</span>
            )}
          </p>

          <div className="lg:col-span-2">
            <Toggle label="Destacado" checked={destacado} color="accent" onChange={setDestacado} />
            <p className="mt-1 text-[11px] text-muted">
              El stock sale de la cantidad de cada variante (o del total). Cuando llega a
              0, el producto queda sin stock solo.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <button
            onClick={submit}
            disabled={saving || !nombre.trim()}
            className="btn btn-primary btn-md w-full"
          >
            <CheckIcon className="h-4.5 w-4.5" /> Guardar
          </button>
          <p className="mt-2 text-center text-[11px] text-muted">
            También se guarda solo al salir (tocá la ✕ o fuera del cuadro).
          </p>
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
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ease-enter motion-reduce:transition-none ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
    </button>
  );
}
