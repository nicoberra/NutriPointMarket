"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConfirm } from "./useConfirm";
import { CopyLinkButton } from "./CopyLinkButton";
import { ComboBreakdown } from "./ComboBreakdown";
import { PhotoViewer } from "./PhotoViewer";
import { MarcaCombo } from "./MarcaCombo";
import { ComboPicker } from "./ComboPicker";
import type { Product } from "@/lib/types";
import { useProducts } from "@/context/ProductsContext";
import { fotosDeComponentes } from "@/lib/stock";
import { useCategories } from "@/context/CategoriesContext";
import {
  saveProduct,
  uploadProductImage,
  deleteProductImage,
  renameProduct,
  deleteRow,
  type ProductInput,
} from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { listPrice } from "@/lib/config";
import { categoryMap } from "@/data/categories";
import { categoriasDe, estaEnCategoria, SEP_CATEGORIAS } from "@/lib/categorias";
import { SearchIcon, CloseIcon, CheckIcon, PlusIcon, TrashIcon, ChevronDownIcon, PackageIcon } from "@/components/Icons";
import { AdminCategories } from "./AdminCategories";
import { EmptyState } from "@/components/Estados";

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
  porCaja: number;
  precioCaja: number;
}>;

export function AdminProducts({ onToast }: { onToast: (m: string) => void }) {
  const { products, refresh } = useProducts();
  const { categories } = useCategories();
  const dollar = useDollar();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);
  const [creandoCombo, setCreandoCombo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCats, setShowCats] = useState(false);
  const { confirm, dialog } = useConfirm();

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return products.filter((p) => {
      if (cat && !estaEnCategoria(p, cat)) return false;
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
      // Conserva TODAS sus categorías con el nombre exacto de la planilla.
      categoria: p.categoryNames?.length ? p.categoryNames.join(SEP_CATEGORIAS) : categoryMap[p.category]?.name ?? "",
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
      // 1 = no viene en caja ("" deja el valor que tenga la planilla).
      porCaja: ch.porCaja ?? (p.unitsPerBox || ""),
      precioCaja: ch.precioCaja ?? (p.boxBasePrice || ""),
    };
    try {
      const ok = await saveProduct(row);
      onToast(ok ? "Guardado ✓" : "No se pudo guardar (reintentá)");
    } catch {
      onToast("Tardó demasiado: verificá si se guardó");
    }
    refresh().catch(() => {});
  };

  // Sube la foto de un producto (o de una variante) a GitHub y refresca.
  // Refresca varias veces: subir a GitHub y escribir la planilla tarda
  // distinto cada vez; así la foto aparece sola sin tener que recargar.
  const refreshLater = (...delays: number[]) =>
    delays.forEach((ms) => setTimeout(() => refresh().catch(() => {}), ms));

  useEffect(() => {
    const evitar = (e: DragEvent) => {
      if (Array.from(e.dataTransfer?.types ?? []).includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", evitar);
    window.addEventListener("drop", evitar);
    return () => {
      window.removeEventListener("dragover", evitar);
      window.removeEventListener("drop", evitar);
    };
  }, []);

  const handleUpload = async (p: Product, file: File, variante?: string) => {
    onToast("Subiendo foto… ⏳");
    try {
      await uploadProductImage(p.name, file, variante);
      onToast("Foto subida ✓ (aparece en unos segundos)");
      refreshLater(2500, 9000);
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
    refreshLater(0);
  };

  // Guardado optimista: cierra al toque y guarda en segundo plano (se siente
  // instantáneo). Igual avisa cuando terminó de guardar.
  const handleFullSave = async (row: ProductInput) => {
    setEditing(null);
    setAdding(false);
    setCreandoCombo(false);
    onToast("Guardando…");
    try {
      const ok = await saveProduct(row);
      onToast(ok ? "Guardado ✓" : "No se pudo guardar (reintentá)");
    } catch {
      onToast("Tardó demasiado: verificá si se guardó");
    }
    refreshLater(0);
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
    refreshLater(0);
  };

  // Grupos por categoría (solo cuando el filtro es "Todas").
  const groups =
    cat === ""
      ? categories
          .map((c) => ({ cat: c, list: filtered.filter((p) => categoriasDe(p).includes(c.slug)) }))
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
            onClick={() => setCreandoCombo(true)}
            className="btn btn-outline btn-md flex-1 sm:flex-none"
          >
            🎁 Combo
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

      {/* Compu: todas las categorías a la vista (bajan de renglón). Celular: fila deslizable. */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
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
        <EmptyState
          icon={<PackageIcon className="h-7 w-7" />}
          title="Todavía no hay productos"
          text="Cargá el primero y aparece en la tienda."
          action={{ label: "Agregar producto", onClick: () => setAdding(true) }}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<SearchIcon className="h-7 w-7" />}
          title="No hay productos para esa búsqueda"
          action={{ label: "Ver todos", onClick: () => { setQ(""); setCat(""); } }}
        />
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

      {(editing || adding || creandoCombo) && (
        <ProductSheet
          product={editing}
          modoCombo={creandoCombo && !editing}
          saving={saving}
          dollar={dollar}
          onClose={() => {
            setEditing(null);
            setAdding(false);
            setCreandoCombo(false);
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

/** Copia el link público del producto (confirma en el mismo botón). */

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
  const { products: todos } = useProducts();
  const fotosCombo = product.combo?.length ? fotosDeComponentes(product, todos).filter((f) => !(product.images ?? []).includes(f)) : [];
  // Fotos arrastradas desde la compu: "" = galería del producto, texto = esa variante.
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const hayArchivos = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");
  const subirVarias = async (files: File[], variante?: string) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return;
    setUploading(true);
    // De a una: cada foto se guarda en GitHub y en la planilla.
    for (const f of imgs) await onUpload(product, f, variante);
    setUploading(false);
  };
  const zonaFotos = (variante?: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!hayArchivos(e)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      setArrastrando(variante ?? "");
    },
    onDragLeave: (e: React.DragEvent) => {
      if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
      setArrastrando(null);
    },
    onDrop: (e: React.DragEvent) => {
      if (!hayArchivos(e)) return;
      e.preventDefault();
      e.stopPropagation();
      setArrastrando(null);
      void subirVarias(Array.from(e.dataTransfer.files), variante);
    },
  });
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
  // Caja: unidades que trae y precio de la caja. El costo guardado es siempre por
  // unidad; el "costo de la caja" se muestra y se edita como costo × unidades.
  const [porCaja, setPorCaja] = useState<number | "">(product.unitsPerBox || "");
  const [precioCaja, setPrecioCaja] = useState<number | "">(product.boxBasePrice || "");
  useEffect(() => {
    setPorCaja(product.unitsPerBox || "");
    setPrecioCaja(product.boxBasePrice || "");
  }, [product.unitsPerBox, product.boxBasePrice]);
  const nCaja = porCaja !== "" && porCaja > 1 ? porCaja : 0;
  // Lo que se tipea en "Costo de la caja" mientras se edita (así se pueden escribir decimales).
  const [cajaTxt, setCajaTxt] = useState<string | null>(null);
  const redondear2 = (n: number) => Math.round(n * 100) / 100;
  // El precio del snapshot/caché puede estar viejo: cuando llega el dato
  // real de la planilla, los campos se actualizan (si no, el CRM mostraba un
  // precio desfasado y al tocar un campo lo guardaba).
  const descModeRef = useRef(descMode);
  descModeRef.current = descMode;
  useEffect(() => {
    const base = product.basePrice ?? product.price;
    const old = product.baseOldPrice && product.baseOldPrice > base ? product.baseOldPrice : undefined;
    setPrecioNormal(old ?? base);
    setDescVal(
      !old ? "" : descModeRef.current === "%" ? Math.round(((old - base) / old) * 100) : old - base,
    );
  }, [product.basePrice, product.baseOldPrice, product.price]);
  const [cantidad, setCantidad] = useState<number | "">(product.stockQty ?? "");
  const hasVars = !!(product.variants && product.variants.length);
  // Visor de fotos (tocar una foto la abre grande, con descarga).
  const [view, setView] = useState<{ src: string; label: string } | null>(null);
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
    onSave(product, { precio: precioFinal, precioML: descPesos > 0 ? precioNormal : 0 });
  };

  return (
    <div
      {...zonaFotos()}
      // Enter en un campo = guardar: suelta el foco (cada campo guarda al salir) sin moverte de lugar.
      onKeyDown={(e) => {
        const el = e.target as HTMLElement;
        if (e.key === "Enter" && el.tagName === "INPUT" && !e.nativeEvent.isComposing) {
          e.preventDefault();
          el.blur();
        }
      }}
      className={`relative rounded-xl border bg-white p-4 transition-colors ${arrastrando === "" ? "border-primary" : "border-line"}`}
    >
      {arrastrando === "" && (
        <div aria-hidden className="pointer-events-none absolute inset-0 z-10 grid animate-fade-in place-items-center rounded-xl border-2 border-dashed border-primary bg-primary/10 text-sm font-bold text-primary motion-reduce:animate-none">
          Soltá para agregar las fotos
        </div>
      )}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase text-muted">
            {product.brand || "—"}
          </p>
          {!product.image && (
            <span className="mb-0.5 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
              Sin foto · oculto en la web
            </span>
          )}
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
          <CopyLinkButton url={`https://suplemarket.com.ar/producto/${product.slug}/`} title="Copiar link del producto" />
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
              <button
                type="button"
                onClick={() => setView({ src, label: product.name })}
                title="Ver / descargar foto"
                className="block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-14 w-14 rounded-lg border border-line object-cover" />
              </button>
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
          <label
            title="Tocá o arrastrá fotos acá"
            className="grid h-14 w-14 cursor-pointer place-items-center rounded-lg border border-dashed border-line text-center text-[10px] font-semibold leading-tight text-primary hover:bg-page-soft"
          >
            {uploading ? "…" : "+ Foto"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                await subirVarias(files);
              }}
            />
          </label>
          <span className="hidden text-[10px] text-muted sm:inline">o arrastrá fotos a la tarjeta</span>
        </div>

        {fotosCombo.length > 0 && (
          <div className="mt-2">
            <p className="mb-1 text-[10px] text-muted">También se muestran en la web (fotos de los productos del combo):</p>
            <div className="flex flex-wrap gap-1.5">
              {fotosCombo.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" className="h-10 w-10 rounded-lg border border-line object-cover opacity-80" />
              ))}
            </div>
          </div>
        )}

        {view && <PhotoViewer src={view.src} label={view.label} onClose={() => setView(null)} />}

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
                <div
                  key={f}
                  {...zonaFotos(f)}
                  className={`relative rounded-lg border p-2 transition-colors ${arrastrando === f ? "border-primary bg-primary/10" : "border-line"}`}
                >
                  {arrastrando === f && (
                    <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center rounded-lg border-2 border-dashed border-primary text-xs font-bold text-primary">
                      Soltá para la foto de {f}
                    </div>
                  )}
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold text-ink">{f}</span>
                    <label className="cursor-pointer rounded border border-line px-2 py-1 text-[11px] font-semibold text-primary hover:bg-page-soft">
                      + Foto
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        disabled={uploading}
                        onChange={async (e) => {
                          const files = Array.from(e.target.files ?? []);
                          e.target.value = "";
                          await subirVarias(files, f);
                        }}
                      />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {vimgs.map((src) => (
                      <div key={src} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <button
                          type="button"
                          onClick={() => setView({ src, label: `${product.name} · ${f}` })}
                          title="Ver / descargar foto"
                          className="block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={src} alt="" className="h-9 w-9 rounded border border-line object-cover" />
                        </button>
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

        {/* Viene en caja: costo de la caja ↔ costo por unidad, y precio de la caja */}
        <div className="mt-3 border-t border-line/70 pt-3">
          <label className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-ink">
              Unidades por caja <span className="font-normal text-muted">(vacío = no viene en caja)</span>
            </span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={porCaja}
              onChange={(e) => setPorCaja(e.target.value ? Math.max(0, Math.floor(Number(e.target.value))) : "")}
              onBlur={() => onSave(product, { porCaja: nCaja || 1 })}
              aria-label="Unidades por caja"
              className="input h-10 w-20 text-center text-base"
            />
          </label>
          {nCaja > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink">Costo de la caja</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={cajaTxt ?? (costo === "" ? "" : redondear2(Number(costo) * nCaja))}
                  onChange={(e) => {
                    setCajaTxt(e.target.value);
                    setCosto(e.target.value ? redondear2(Number(e.target.value) / nCaja) : "");
                  }}
                  onBlur={() => {
                    setCajaTxt(null);
                    saveCosto();
                  }}
                  className="input h-10 text-base"
                />
              </label>
              <div className="rounded-lg border border-line bg-white px-3 py-1.5">
                <span className="block text-xs font-semibold text-ink">Costo de cada una</span>
                <span className="font-display text-base font-black text-primary">
                  {costoNum > 0
                    ? `$ ${redondear2(costoPesos).toLocaleString("es-AR", { maximumFractionDigits: 2 })}`
                    : "—"}
                </span>
              </div>
              {/* Precios de venta (con transferencia): la caja y cada una por separado */}
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink">Precio de la caja</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={precioCaja}
                  placeholder="No se vende por caja"
                  onChange={(e) => setPrecioCaja(e.target.value ? Number(e.target.value) : "")}
                  onBlur={() => onSave(product, { precioCaja: precioCaja === "" ? 0 : precioCaja })}
                  className="input h-10 text-base placeholder:text-xs"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink">Precio de cada una</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={precioNormal}
                  onChange={(e) => setPrecioNormal(Number(e.target.value))}
                  onBlur={savePrices}
                  className="input h-10 text-base"
                />
              </label>
              <p className="col-span-2 text-[11px] text-muted">
                Precios con transferencia. Vacío el de la caja = solo se vende por unidad.
              </p>
              {precioCaja !== "" && precioCaja > 0 && (
                <div className="col-span-2 space-y-1 rounded-lg border border-line bg-white px-3 py-2 text-xs text-muted">
                  <p>
                    En la web: <b className="text-ink">{formatPrice(listPrice(precioCaja))}</b> la caja ·{" "}
                    <b className="text-ink">{formatPrice(listPrice(precioFinal))}</b> cada una
                  </p>
                  {costoPesos > 0 && (
                    <p className="flex flex-wrap gap-1.5">
                      <span className="rounded-full bg-green-100 px-2 py-0.5 font-bold text-green-700">
                        Ganancia por caja {formatPrice(Math.round(precioCaja - costoPesos * nCaja))}
                      </span>
                      {precioFinal > 0 && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 font-bold text-green-700">
                          Las {nCaja} sueltas: ganancia {formatPrice(Math.round((precioFinal - costoPesos) * nCaja))}
                        </span>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
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
  modoCombo = false,
  saving,
  dollar,
  onClose,
  onSave,
}: {
  product: Product | null;
  /** Abierto desde "Crear combo": la lista de productos aparece primero y abierta. */
  modoCombo?: boolean;
  saving: boolean;
  dollar: number;
  onClose: () => void;
  onSave: (row: ProductInput) => void;
}) {
  const { categories } = useCategories();
  const { products: allProducts } = useProducts();
  const isEdit = !!product;
  const [nombre, setNombre] = useState(product?.name ?? "");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [comboRows, setComboRows] = useState<{ n: string; q: string }[]>(
    product?.combo ? product.combo.map((c) => ({ n: c.n, q: String(c.q) })) : [],
  );
  const [marca, setMarca] = useState(product?.brand ?? "");
  // Marcas que ya existen (de los productos cargados, sin combos ni repetidas por mayúsculas).
  const marcasExistentes = useMemo(() => {
    const cuenta = new Map<string, Map<string, number>>();
    for (const p of allProducts) {
      const m = p.brand?.trim();
      if (!m || p.combo?.length || m.includes(" / ")) continue;
      const k = m.toLowerCase();
      const formas = cuenta.get(k) ?? new Map<string, number>();
      formas.set(m, (formas.get(m) ?? 0) + 1);
      cuenta.set(k, formas);
    }
    return Array.from(cuenta.values())
      .map((f) => Array.from(f.entries()).sort((a, b) => b[1] - a[1])[0][0])
      .sort((a, b) => a.localeCompare(b, "es"));
  }, [allProducts]);
  // Puede estar en varias categorías; la primera elegida es la principal.
  const [cats, setCats] = useState<string[]>(() => {
    if (product?.categoryNames?.length) return product.categoryNames;
    const n = product ? categoryMap[product.category]?.name : undefined;
    const combos = modoCombo ? categories.find((c) => /combo/i.test(c.name))?.name : undefined;
    return n ? [n] : combos ? [combos] : categories[0]?.name ? [categories[0].name] : [];
  });
  const toggleCat = (n: string) =>
    setCats((prev) => (prev.some((x) => x.toLowerCase() === n.toLowerCase()) ? prev.filter((x) => x.toLowerCase() !== n.toLowerCase()) : [...prev, n]));
  const categoria = cats.join(SEP_CATEGORIAS);
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
  // Combo: la descripción se arma sola con sus productos hasta que la edites a mano.
  const [descTocada, setDescTocada] = useState(!!product?.description);
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
  // Descripción del combo: qué incluye + la descripción de cada producto.
  const comboDescription = isCombo
    ? [
        "Este combo incluye:\n" +
          comboCostDetail.map((d) => `• ${d.q} × ${d.name}${d.brand ? ` (${d.brand})` : ""}`).join("\n"),
        ...comboProducts.filter((p) => p.description?.trim()).map((p) => `${p.name}:\n${p.description!.trim()}`),
      ].join("\n\n")
    : "";
  useEffect(() => {
    if (isCombo && !descTocada) setDescripcion(comboDescription);
  }, [isCombo, descTocada, comboDescription]);
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

  const submit = async () => {
    if (!nombre.trim()) return;
    // Cambio de nombre: primero se renombra la fila (y los combos que lo
    // usan) y recién después se guarda el resto con el nombre nuevo.
    if (isEdit && product && nombre.trim() !== product.name) {
      const ok = await renameProduct(product.name, nombre.trim());
      if (!ok) {
        setRenameError("No se pudo renombrar. ¿Ya existe otro producto con ese nombre?");
        return;
      }
    }
    const cantNum = cantidad === "" ? 0 : Number(cantidad);
    // Si las variantes tienen stock, el total sale de la suma de ellas.
    const totalStock = hasVariantStock ? variantTotal : cantNum;
    onSave({
      nombre: nombre.trim(),
      marca: isCombo ? comboBrand : marca.trim(),
      categoria,
      precio: precioFinal,
      precioML: descPesos > 0 ? precioNormal : 0,
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
            {isEdit ? "Editar producto" : modoCombo ? "Crear combo" : "Agregar producto"}
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
                onChange={(e) => {
                  setNombre(e.target.value);
                  setRenameError(null);
                }}
                className="input h-11 text-base"
                placeholder="Ej: Whey Protein 1 Kg"
              />
            </Field>
          </div>
          {renameError && (
            <p className="-mt-1 text-[11px] font-semibold text-sale lg:col-span-2">{renameError}</p>
          )}
          {isEdit && !renameError && (
            <p className="-mt-1 text-[11px] text-muted lg:col-span-2">
              Si cambiás el nombre, se renombra en la planilla y en los combos que lo incluyen.
            </p>
          )}

          {/* Combo */}
          <div className="lg:col-span-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
            <span className="mb-1 block text-xs font-semibold text-ink">
              {modoCombo ? "Productos del combo — tildá los que lo arman" : "Combo (opcional) — elegí los productos que lo arman"}
            </span>
            <p className="mb-2 text-[11px] text-muted">
              Si agregás productos acá, este producto es un <b>combo</b>: al venderse se
              descuenta el stock de cada uno. El stock del combo se calcula solo según lo
              que haya de cada producto.
            </p>
            <ComboPicker
              value={comboRows}
              onChange={setComboRows}
              productos={allProducts.filter((pr) => pr.name !== nombre && !(pr.combo && pr.combo.length))}
              abiertoAlInicio={modoCombo}
            />

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
                <MarcaCombo value={marca} onChange={setMarca} marcas={marcasExistentes} />
              )}
            </Field>
            <Field label="Categorías">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Categorías del producto">
                {categories.map((c) => {
                  const i = cats.findIndex((x) => x.toLowerCase() === c.name.toLowerCase());
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => toggleCat(c.name)}
                      aria-pressed={i >= 0}
                      className={`rounded-full px-3 py-1.5 text-sm font-semibold transition active:scale-[0.97] motion-reduce:active:scale-100 ${
                        i >= 0 ? "bg-primary text-white shadow-soft" : "border border-line bg-white text-ink hover:border-primary/40"
                      }`}
                    >
                      {i >= 0 && "✓ "}
                      {c.name}
                      {i === 0 && cats.length > 1 && <span className="ml-1 text-[10px] font-bold uppercase opacity-80">principal</span>}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {cats.length ? "Tocá para sumar o sacar categorías. La primera que elegiste es la principal." : "Elegí al menos una categoría."}
              </p>
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
              onChange={(e) => {
                setDescripcion(e.target.value);
                setDescTocada(true);
              }}
              className={`input py-2 text-base ${isCombo ? "min-h-40" : "min-h-24"}`}
              placeholder="Detalle del producto, beneficios…"
            />
            {isCombo && (
              <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                {descTocada ? "La editaste a mano." : "Se arma sola con los productos del combo; podés editarla."}
                {descTocada && (
                  <button type="button" onClick={() => setDescTocada(false)} className="font-bold text-primary hover:underline">
                    ↺ Volver a armarla según los productos
                  </button>
                )}
              </span>
            )}
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
              La <b>descripción, el modo de uso, la info nutricional y los ingredientes</b> del
              combo se arman solos con los productos que elegiste.
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
export function useDollar(): number {
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
export function costToPesos(costo: number, moneda: "USD" | "ARS", dollar: number): number {
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
