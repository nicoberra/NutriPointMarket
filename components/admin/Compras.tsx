"use client";

import { useMemo, useState } from "react";
import { useProducts } from "@/context/ProductsContext";
import { brandName } from "@/data/brands";
import { CloseIcon, PlusIcon, TrashIcon } from "@/components/Icons";

/**
 * Compras de mercadería a proveedores. Cada producto se guarda como un renglón
 * legible en la columna "Detalle" de la planilla:
 *   "3 x ENA · Creatina Micronizada 150 g · $15.121,80 c/u"
 * así se entiende a simple vista en Sheets y el CRM lo vuelve a armar como tabla.
 */

type Row = Record<string, string>;
export type ItemCompra = { cantidad: number; marca: string; producto: string; precio: number };

const MARCAS_CONOCIDAS = ["Star Nutrition", "ENA", "Granger", "Sportstape", "Integra"];

const num = (v: unknown): number => {
  const s = String(v ?? "").trim();
  if (!s) return 0;
  // "15.121,80" (formato argentino) o "15121.80"
  const n = /,\d{1,2}$/.test(s) || /\.\d{3}/.test(s) ? Number(s.replace(/\./g, "").replace(",", ".")) : Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const pesos = (n: number) =>
  "$" + n.toLocaleString("es-AR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const precioTexto = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function itemsDeCompra(detalle: string | undefined): ItemCompra[] {
  return String(detalle ?? "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      // formato nuevo: "3 x ENA · Producto · $15.121,80 c/u"
      let m = l.match(/^(\d+)\s*x\s*(.*?)\s*·\s*(.*?)\s*·\s*\$?\s*([\d.,]+)\s*c\/u/i);
      if (m) return { cantidad: Number(m[1]), marca: m[2], producto: m[3], precio: num(m[4]) };
      // formato viejo: "3x ENA Producto — $15.121,80 c/u = …"
      m = l.match(/^(\d+)\s*x\s*(.*?)\s+—\s+\$?\s*([\d.,]+)\s*c\/u/i);
      if (m) {
        const marca = MARCAS_CONOCIDAS.find((b) => m![2].toLowerCase().startsWith(b.toLowerCase())) || "";
        return { cantidad: Number(m[1]), marca, producto: m[2].slice(marca.length).trim(), precio: num(m[3]) };
      }
      return { cantidad: 0, marca: "", producto: l, precio: 0 };
    });
}

export function detalleDeCompra(items: ItemCompra[]): string {
  return items
    .filter((i) => i.producto.trim())
    .map((i) => `${i.cantidad} x ${i.marca.trim() || "Sin marca"} · ${i.producto.trim()} · $${precioTexto(i.precio)} c/u`)
    .join("\n");
}

/** Resumen corto para la lista: "12 productos · 40 unidades". */
export function resumenCompra(r: Row): string {
  const it = itemsDeCompra(r.detalle);
  const u = it.reduce((a, i) => a + i.cantidad, 0);
  return it.length ? `${it.length} productos · ${u} unidades` : String(r.detalle || "").split("\n")[0];
}

const norm = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 || /\d/.test(w));

type OpcionStock = { value: string; label: string; tokens: string[]; variante: string };

/** Valor del selector para crear el producto en la tienda. */
const NUEVO = "__nuevo__";

/**
 * Producto del catálogo más parecido a "marca + producto" (o "" si no hay uno claro).
 * Suma 1 por cada palabra en común, resta un poco por las que sobran, y la variante
 * (sabor/color) tiene que aparecer en la línea de la compra.
 */
function sugerir(marca: string, producto: string, opciones: OpcionStock[]): string {
  const t = new Set(norm(`${marca} ${producto}`));
  if (t.size < 2) return "";
  let mejor = "", max = 0, empate = false;
  for (const o of opciones) {
    let sc = 0;
    for (const w of Array.from(new Set(o.tokens))) sc += t.has(w) ? 1 : -0.3;
    if (o.variante && norm(o.variante).every((w) => t.has(w))) sc += 2;
    else if (o.variante) sc -= 1;
    if (sc > max + 1e-9) { max = sc; mejor = o.value; empate = false; }
    else if (Math.abs(sc - max) < 1e-9) empate = true;
  }
  return max >= 2.5 && !empate ? mejor : "";
}

const fechaCorta = (f?: string) => {
  const m = String(f ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(f ?? "");
};

function Hoja({ titulo, onClose, acciones, children, as = "div", onSubmit }: {
  titulo: string; onClose: () => void; acciones?: React.ReactNode; children: React.ReactNode;
  as?: "div" | "form"; onSubmit?: (e: React.FormEvent) => void;
}) {
  const Tag = as;
  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 animate-fade-in bg-black/50 motion-reduce:animate-none" onClick={onClose} />
      <Tag
        onSubmit={onSubmit}
        className="relative max-h-[92vh] w-full max-w-lg animate-section-in overflow-y-auto rounded-t-2xl bg-page p-5 motion-reduce:animate-none sm:rounded-2xl"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-display text-lg font-bold text-primary">{titulo}</h3>
          <div className="ml-auto flex items-center gap-2">
            {acciones}
            <button type="button" onClick={onClose} aria-label="Cerrar" className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-page-soft">
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        {children}
      </Tag>
    </div>
  );
}

/* ------------------------------ Detalle ---------------------------------- */

export function CompraDetail({ row, onClose, onEdit }: { row: Row; onClose: () => void; onEdit: () => void }) {
  const items = itemsDeCompra(row.detalle);
  const unidades = items.reduce((a, i) => a + i.cantidad, 0);
  const calculado = items.reduce((a, i) => a + i.cantidad * i.precio, 0);
  const total = num(row.total) || calculado;
  return (
    <Hoja
      titulo="Compra de mercadería"
      onClose={onClose}
      acciones={
        <button onClick={onEdit} className="inline-flex items-center gap-1 rounded-full border border-primary/30 px-3 py-1 text-xs font-bold text-primary hover:bg-accent-soft">
          ✎ Editar
        </button>
      }
    >
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-white p-3">
          <div><p className="text-[11px] font-bold uppercase tracking-wide text-muted">Fecha</p><p className="font-semibold text-ink">{fechaCorta(row.fecha) || "—"}</p></div>
          <div><p className="text-[11px] font-bold uppercase tracking-wide text-muted">Proveedor</p><p className="font-semibold text-ink">{row.proveedor || "—"}</p></div>
          {row.pago && <div><p className="text-[11px] font-bold uppercase tracking-wide text-muted">Forma de pago</p><p className="font-semibold text-ink">{row.pago}</p></div>}
          <div><p className="text-[11px] font-bold uppercase tracking-wide text-muted">Unidades</p><p className="font-semibold text-ink">{unidades}</p></div>
          {row.sumado === "sí" && (
            <p className="col-span-2 rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">✓ Estas unidades se sumaron al stock de la tienda</p>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 border-b border-line bg-page-soft px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-muted">
            <span>Marca y producto</span><span className="text-right">Unid.</span><span className="w-24 text-right">Subtotal</span>
          </div>
          <ul>
            {items.map((i, k) => (
              <li key={k} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 border-b border-line px-3 py-2.5 last:border-b-0">
                <div className="min-w-0">
                  {i.marca && <p className="text-[11px] font-bold uppercase tracking-wide text-primary">{i.marca}</p>}
                  <p className="font-medium leading-snug text-ink">{i.producto}</p>
                  {i.precio > 0 && <p className="text-xs text-muted">{pesos(i.precio)} c/u</p>}
                </div>
                <span className="text-right font-semibold text-ink">{i.cantidad || "—"}</span>
                <span className="w-24 text-right font-semibold text-ink">{i.precio ? pesos(i.cantidad * i.precio) : "—"}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t-2 border-primary/20 bg-accent-soft px-3 py-3">
            <span className="font-bold text-ink">Total</span>
            <span className="font-display text-lg font-black text-primary">{pesos(total)}</span>
          </div>
        </div>

        {row.notas && (
          <div className="rounded-xl border border-line bg-white p-3">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted">Notas</p>
            <p className="text-muted">{row.notas}</p>
          </div>
        )}
      </div>
    </Hoja>
  );
}

/* ------------------------------ Formulario -------------------------------- */

export function CompraSheet({ initial, saving, onClose, onSave }: {
  initial?: Row; saving: boolean; onClose: () => void; onSave: (r: Row) => void;
}) {
  const { products } = useProducts();
  const hoy = new Date();
  const p2 = (n: number) => String(n).padStart(2, "0");
  const [fecha, setFecha] = useState(String(initial?.fecha ?? "").slice(0, 10) || `${hoy.getFullYear()}-${p2(hoy.getMonth() + 1)}-${p2(hoy.getDate())}`);
  const [proveedor, setProveedor] = useState(initial?.proveedor ?? "");
  const [pago, setPago] = useState(initial?.pago ?? "");
  const [notas, setNotas] = useState(initial?.notas ?? "");
  // Suma al stock solo en compras nuevas o en las que ya sumaron (las viejas no).
  const sumaStock = !initial?.id || initial.sumado === "sí";
  const [items, setItems] = useState<{ cantidad: string; marca: string; producto: string; precio: string; cat?: string }[]>(() => {
    const it = itemsDeCompra(initial?.detalle);
    let mapa: { n: string; v?: string; i: number }[] = [];
    try { mapa = JSON.parse(initial?.items || "[]"); } catch { /* sin datos */ }
    return it.length
      ? it.map((i, k) => {
          const m = mapa.find((x) => x.i === k);
          return { cantidad: String(i.cantidad || ""), marca: i.marca, producto: i.producto, precio: i.precio ? precioTexto(i.precio) : "", cat: initial?.items ? (m ? `${m.n}||${m.v || ""}` : "") : undefined };
        })
      : [{ cantidad: "1", marca: "", producto: "", precio: "" }];
  });
  const opciones: OpcionStock[] = useMemo(
    () =>
      products
        .filter((p) => !p.combo?.length)
        .flatMap((p) => {
          const marca = brandName(p.brand);
          const base = (v: string) => ({ value: `${p.name}||${v}`, label: [marca, p.name, v].filter(Boolean).join(" · "), tokens: norm(`${marca} ${p.name} ${v}`), variante: v });
          return p.flavors?.length ? p.flavors.map(base) : [base("")];
        }),
    [products],
  );
  // Si no coincide con ningún producto de la tienda, por defecto se crea uno nuevo.
  const catDe = (it: { marca: string; producto: string; cat?: string }) =>
    it.cat !== undefined ? it.cat : sugerir(it.marca, it.producto, opciones) || (it.producto.trim() ? NUEVO : "");
  const marcas = useMemo(() => Array.from(new Set([...MARCAS_CONOCIDAS, ...products.map((p) => brandName(p.brand)).filter(Boolean)])), [products]);
  const total = items.reduce((a, i) => a + (Number(i.cantidad) || 0) * num(i.precio), 0);
  const unidades = items.reduce((a, i) => a + (Number(i.cantidad) || 0), 0);
  const set = (k: number, campo: string, v: string) => setItems((prev) => prev.map((it, i) => (i === k ? { ...it, [campo]: v } : it)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !proveedor.trim()) return;
    const conProducto = items.filter((i) => i.producto.trim());
    const lista: ItemCompra[] = conProducto.map((i) => ({ cantidad: Number(i.cantidad) || 0, marca: i.marca, producto: i.producto, precio: num(i.precio) }));
    const stock = conProducto
      .map((it, k) => {
        const q = Number(it.cantidad);
        if (!(q > 0)) return null;
        if (catDe(it) === NUEVO) return { nuevo: true, n: it.producto.trim(), marca: it.marca.trim(), q, costo: num(it.precio), i: k };
        const [n, v] = catDe(it).split("||");
        return n ? { n, ...(v ? { v } : {}), q, i: k } : null;
      })
      .filter(Boolean);
    onSave({
      ...(initial?.id ? { id: initial.id } : {}),
      fecha,
      proveedor: proveedor.trim(),
      pago,
      detalle: detalleDeCompra(lista),
      total: String(Math.round(total * 100) / 100),
      notas,
      ...(sumaStock ? { items: JSON.stringify(stock) } : {}),
    });
  };

  return (
    <Hoja titulo={initial?.id ? "Editar compra" : "Nueva compra"} onClose={onClose} as="form" onSubmit={submit}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1 block text-xs font-semibold text-ink">Fecha</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="input h-11 text-base" /></label>
          <label className="block"><span className="mb-1 block text-xs font-semibold text-ink">Proveedor <span className="text-sale">*</span></span>
            <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} required placeholder="Ej: El Nogal" className="input h-11 text-base" /></label>
        </div>

        <div>
          <p className="mb-1 text-xs font-semibold text-ink">Productos</p>
          <datalist id="marcas-compra">{marcas.map((m) => <option key={m} value={m} />)}</datalist>
          <ul className="space-y-2">
            {items.map((it, k) => (
              <li key={k} className="rounded-xl border border-line bg-white p-2.5">
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input list="marcas-compra" value={it.marca} onChange={(e) => set(k, "marca", e.target.value)} placeholder="Marca" aria-label="Marca" className="input h-10 text-sm" />
                  <button type="button" onClick={() => setItems((p) => (p.length > 1 ? p.filter((_, i) => i !== k) : p))} aria-label="Quitar producto" className="grid h-10 w-10 place-items-center rounded-full text-sale hover:bg-sale/10">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
                <input value={it.producto} onChange={(e) => set(k, "producto", e.target.value)} placeholder="Producto (ej: Whey Protein 2 lb Vainilla)" aria-label="Producto" className="input mt-2 h-10 text-sm" />
                <div className="mt-2 grid grid-cols-[90px_1fr_auto] items-center gap-2">
                  <input inputMode="numeric" value={it.cantidad} onChange={(e) => set(k, "cantidad", e.target.value.replace(/\D/g, ""))} placeholder="Unid." aria-label="Unidades" className="input h-10 text-sm" />
                  <input inputMode="decimal" value={it.precio} onChange={(e) => set(k, "precio", e.target.value)} placeholder="Precio c/u" aria-label="Precio por unidad" className="input h-10 text-sm" />
                  <span className="w-24 text-right text-sm font-semibold text-ink">{pesos((Number(it.cantidad) || 0) * num(it.precio))}</span>
                </div>
                {sumaStock && (
                  <label className="mt-2 block">
                    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">Sumar al stock de</span>
                    <select value={catDe(it)} onChange={(e) => set(k, "cat", e.target.value)} className={`input h-10 text-sm ${catDe(it) === NUEVO ? "border-amber-300 bg-amber-50" : catDe(it) ? "border-green-300 bg-green-50" : ""}`}>
                      <option value="">No sumar al stock</option>
                      {it.producto.trim() && <option value={NUEVO}>➕ Producto nuevo: {it.producto.trim()}</option>}
                      {opciones.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {catDe(it) === NUEVO && <span className="mt-1 block text-[11px] text-muted">Se crea en Productos (sin foto ni precio, no se ve en la tienda hasta que lo completes).</span>}
                  </label>
                )}
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setItems((p) => [...p, { cantidad: "1", marca: "", producto: "", precio: "" }])} className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-primary">
            <PlusIcon className="h-4 w-4" /> Agregar producto
          </button>
        </div>

        {!sumaStock && (
          <p className="rounded-lg bg-page-soft px-3 py-2 text-xs text-muted">Esta compra se cargó antes de que las compras sumaran stock: editarla no cambia el stock.</p>
        )}
        <label className="block"><span className="mb-1 block text-xs font-semibold text-ink">Forma de pago</span>
          <select value={pago} onChange={(e) => setPago(e.target.value)} className="input h-11 text-base">
            <option value="">Elegí una opción…</option>
            {["Efectivo", "Transferencia", "Mercado Pago", "Otro"].map((o) => <option key={o}>{o}</option>)}
          </select></label>
        <label className="block"><span className="mb-1 block text-xs font-semibold text-ink">Notas</span>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="input text-base" /></label>

        <div className="flex items-center justify-between rounded-xl bg-accent-soft px-4 py-3">
          <span className="text-sm font-semibold text-ink">{unidades} unidades · Total</span>
          <span className="font-display text-xl font-black text-primary">{pesos(total)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn btn-outline btn-md">Cancelar</button>
          <button type="submit" disabled={saving || !proveedor.trim()} className="btn btn-primary btn-md">{saving ? "Guardando…" : "Guardar compra"}</button>
        </div>
      </div>
    </Hoja>
  );
}
