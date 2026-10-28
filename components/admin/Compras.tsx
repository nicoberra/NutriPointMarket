"use client";

import { useMemo, useState } from "react";
import { useProducts } from "@/context/ProductsContext";
import { brandName } from "@/data/brands";
import { CheckIcon, CloseIcon, MinusIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import { ACEPTA_ARCHIVOS, leerCompra, type AnalisisCompra, type ArchivoCompra } from "@/lib/compras";
import { MoneyInput } from "./MoneyInput";

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

/** Unidades por caja según el nombre: "(caja x 10)", "x 12 u", "10U". 0 si no es una caja. */
export function unidadesPorCaja(producto: string): number {
  const m = producto.match(/caja\s*(?:x|de)\s*(\d+)/i) || producto.match(/\b(\d+)\s*u(?:nid(?:ades)?)?\b/i);
  const n = m ? Number(m[1]) : 0;
  return n > 1 ? n : 0;
}

/** "Caja $19.189,50 · $1.918,95 c/u (x 10)" para los productos que vienen en caja. */
function PrecioPorCaja({ producto, precio }: { producto: string; precio: number }) {
  const n = unidadesPorCaja(producto);
  if (!n || !precio) return null;
  return (
    <p className="text-xs font-semibold text-orange-600">
      Caja x {n}: {pesos(precio / n)} cada una
    </p>
  );
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
  const adj = archivosDeCompra(r).length;
  return [
    it.length ? `${it.length} productos · ${u} unidades` : String(r.detalle || "").split("\n")[0],
    adj ? `📎 ${adj}` : "",
    r.sumado === "no" ? "⏳ sin sumar" : "",
  ]
    .filter(Boolean)
    .join(" · ");
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

export function CompraDetail({ row, onClose, onEdit, onSumar }: { row: Row; onClose: () => void; onEdit: () => void; onSumar?: () => void }) {
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
          {row.sumado === "no" && (
            <div className="col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-900">⏳ Pendiente: estas unidades todavía no se sumaron al stock.</p>
              <p className="mt-0.5 text-[11px] text-amber-800">Revisá que esté todo bien (cantidades y productos) y después sumala.</p>
              {onSumar && (
                <button type="button" onClick={onSumar} className="btn btn-primary btn-md mt-2.5 w-full">
                  Sumar al stock
                </button>
              )}
            </div>
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
                  {i.precio > 0 && (
                    <p className="text-xs text-muted">
                      {pesos(i.precio)} {unidadesPorCaja(i.producto) ? "la caja" : "c/u"}
                    </p>
                  )}
                  <PrecioPorCaja producto={i.producto} precio={i.precio} />
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

        {archivosDeCompra(row).length > 0 && <Adjuntos archivos={archivosDeCompra(row)} />}

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

type ItemForm = { cantidad: string; marca: string; producto: string; precio: string; cat?: string; ia?: boolean };
type Entrada = { file?: File; texto?: string };
type Lectura = { id: number; nombre: string; estado: "leyendo" | "listo" | "error"; detalle?: string; preview?: string; entrada: Entrada };

const PAGOS = ["Efectivo", "Transferencia", "Mercado Pago", "Otro"];
const vacio = (): ItemForm => ({ cantidad: "1", marca: "", producto: "", precio: "" });

export function archivosDeCompra(r?: Row): ArchivoCompra[] {
  try {
    const a = JSON.parse(r?.archivos || "[]");
    return Array.isArray(a) ? a.filter((x) => x && x.url) : [];
  } catch {
    return [];
  }
}

export function CompraSheet({ initial, saving, onClose, onSave }: {
  initial?: Row; saving: boolean; onClose: () => void; onSave: (r: Row) => void;
}) {
  const { products } = useProducts();
  const hoy = new Date();
  const p2 = (n: number) => String(n).padStart(2, "0");
  const [fecha, setFecha] = useState(String(initial?.fecha ?? "").slice(0, 10) || `${hoy.getFullYear()}-${p2(hoy.getMonth() + 1)}-${p2(hoy.getDate())}`);
  const [fechaTocada, setFechaTocada] = useState(!!initial?.fecha);
  const [proveedor, setProveedor] = useState(initial?.proveedor ?? "");
  const [pago, setPago] = useState(initial?.pago ?? "");
  const [notas, setNotas] = useState(initial?.notas ?? "");
  const [archivos, setArchivos] = useState<ArchivoCompra[]>(() => archivosDeCompra(initial));
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [escribir, setEscribir] = useState(false);
  const [texto, setTexto] = useState("");
  const [aviso, setAviso] = useState<{ n: number; fuente: string; dudas: string; total: number } | null>(null);
  // Suma al stock solo en compras nuevas, pendientes o que ya sumaron (las viejas no).
  const pendiente = initial?.sumado === "no";
  const elegirSuma = !initial?.id || pendiente;
  const sumaStock = elegirSuma || initial?.sumado === "sí";
  const [sumarAhora, setSumarAhora] = useState(false);
  const [items, setItems] = useState<ItemForm[]>(() => {
    const it = itemsDeCompra(initial?.detalle);
    let mapa: { n: string; v?: string; i: number }[] = [];
    try { mapa = JSON.parse(initial?.items || "[]"); } catch { /* sin datos */ }
    return it.length
      ? it.map((i, k) => {
          const m = mapa.find((x) => x.i === k);
          return { cantidad: String(i.cantidad || ""), marca: i.marca, producto: i.producto, precio: i.precio ? precioTexto(i.precio) : "", cat: initial?.items ? (m ? `${m.n}||${m.v || ""}` : "") : undefined };
        })
      : [vacio()];
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
  const conProducto = items.filter((i) => i.producto.trim()).length;
  const leyendo = lecturas.some((l) => l.estado === "leyendo");
  const set = (k: number, campo: keyof ItemForm, v: string) =>
    setItems((prev) => prev.map((it, i) => (i === k ? { ...it, [campo]: v, ia: false } : it)));
  const sumar = (k: number, d: number) => set(k, "cantidad", String(Math.max(0, (Number(items[k].cantidad) || 0) + d)));

  // Lo que la IA leyó se agrega a la lista (o la reemplaza si estaba vacía).
  const aplicar = (a: AnalisisCompra, fuente: string) => {
    const valores = new Map(opciones.map((o) => [o.value.toLowerCase(), o.value]));
    const nuevos: ItemForm[] = a.items.map((i) => {
      const yaTiene = i.variante && norm(i.producto).join(" ").includes(norm(i.variante).join(" "));
      return {
        cantidad: String(i.cantidad || ""),
        marca: i.marca,
        producto: i.variante && !yaTiene ? `${i.producto} ${i.variante}` : i.producto,
        precio: i.precioUnitario ? precioTexto(i.precioUnitario) : "",
        cat: (i.catalogo && valores.get(i.catalogo.toLowerCase())) || undefined,
        ia: true,
      };
    });
    setItems((prev) => {
      const soloVacio = prev.every((x) => !x.producto.trim() && !x.precio.trim());
      return soloVacio ? (nuevos.length ? nuevos : prev) : [...prev, ...nuevos];
    });
    if (a.proveedor) setProveedor((p) => (p.trim() ? p : a.proveedor));
    if (a.fecha && !fechaTocada) setFecha(a.fecha);
    if (a.notas) setNotas((n) => (n.trim() ? `${n}\n${a.notas}` : a.notas));
    setAviso({ n: nuevos.length, fuente, dudas: a.dudas, total: a.total });
  };

  const procesar = async (entrada: Entrada, nombre: string, reintento?: number) => {
    const id = reintento ?? Date.now() + Math.random();
    const preview = entrada.file?.type.startsWith("image/") ? URL.createObjectURL(entrada.file) : undefined;
    const fila: Lectura = { id, nombre, estado: "leyendo", preview, entrada };
    setLecturas((l) => (reintento ? l.map((x) => (x.id === id ? { ...x, ...fila, preview: x.preview } : x)) : [...l, fila]));
    const fin = (estado: Lectura["estado"], detalle: string) => setLecturas((l) => l.map((x) => (x.id === id ? { ...x, estado, detalle } : x)));
    try {
      const catalogo = opciones.map((o) => `"${o.value}" · ${o.label}`);
      const r = await leerCompra(entrada, catalogo, marcas);
      if (r.archivo) setArchivos((a) => (a.some((x) => x.id === r.archivo!.id) ? a : [...a, r.archivo!]));
      if (r.ok === false) throw new Error(r.error || "No se pudo leer");
      if (r.analisis) {
        aplicar(r.analisis, nombre);
        const n = r.analisis.items.length;
        fin("listo", n ? `${n} ${n === 1 ? "producto" : "productos"} · ${r.gratis ? "leído gratis" : "leído con IA"}` : "No encontré productos");
      } else {
        fin("error", r.errorLectura ? `Quedó guardado, pero no se pudo leer: ${r.errorLectura}` : "No se pudo leer");
      }
    } catch (e) {
      fin("error", e instanceof Error ? e.message : "No se pudo leer");
    }
  };

  const elegirArchivos = (lista: FileList | null) => {
    Array.from(lista ?? []).forEach((f) => procesar({ file: f }, f.name || "Foto"));
  };
  const leerTexto = () => {
    if (!texto.trim()) return;
    procesar({ texto }, "Compra escrita");
    setTexto("");
    setEscribir(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || leyendo || !proveedor.trim()) return;
    const conProd = items.filter((i) => i.producto.trim());
    const lista: ItemCompra[] = conProd.map((i) => ({ cantidad: Number(i.cantidad) || 0, marca: i.marca, producto: i.producto, precio: num(i.precio) }));
    const stock = conProd
      .map((it, k) => {
        // Si viene en caja ("caja x 10"), al stock entran las unidades sueltas y el costo es por unidad.
        const porCaja = unidadesPorCaja(it.producto) || 1;
        const q = Number(it.cantidad) * porCaja;
        if (!(q > 0)) return null;
        if (catDe(it) === NUEVO)
          return { nuevo: true, n: it.producto.trim(), marca: it.marca.trim(), q, costo: Math.round((num(it.precio) / porCaja) * 100) / 100, i: k };
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
      archivos: archivos.length ? JSON.stringify(archivos) : "",
      ...(sumaStock ? { items: JSON.stringify(stock) } : {}),
      // Nueva o pendiente: se suma ahora solo si se marcó; si no, queda pendiente.
      ...(elegirSuma ? { sumar: sumarAhora ? "sí" : "no" } : {}),
    });
  };

  const diferencia = aviso && aviso.total > 0 && Math.abs(aviso.total - total) > Math.max(1, aviso.total * 0.01);

  return (
    <Hoja titulo={initial?.id ? "Editar compra" : "Nueva compra"} onClose={onClose} as="form" onSubmit={submit}>
      <div className="space-y-4">
        {/* Carga automática con IA */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary to-[#4a52f0] p-4 text-white shadow-card">
          <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-accent/25 blur-2xl" />
          <p className="relative text-[11px] font-bold uppercase tracking-[0.16em] text-accent">✨ Carga automática</p>
          <h4 className="relative mt-1 font-display text-lg font-bold leading-snug">Subí la factura, sacale una foto o escribí la compra</h4>
          <p className="relative mt-1 text-xs leading-relaxed text-white/75">Leo los productos, las cantidades y los precios y los cargo abajo. Después revisás y guardás.</p>
          <div className="relative mt-3 grid grid-cols-3 gap-2">
            <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl bg-white/10 px-2 py-3 text-xs font-bold ring-1 ring-white/20 transition hover:bg-white/20 active:scale-[0.97] motion-reduce:active:scale-100">
              <span className="text-xl" aria-hidden>📷</span> Foto
              <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { elegirArchivos(e.target.files); e.target.value = ""; }} />
            </label>
            <label className="flex cursor-pointer flex-col items-center gap-1 rounded-xl bg-white/10 px-2 py-3 text-xs font-bold ring-1 ring-white/20 transition hover:bg-white/20 active:scale-[0.97] motion-reduce:active:scale-100">
              <span className="text-xl" aria-hidden>📎</span> Archivo
              <input type="file" accept={ACEPTA_ARCHIVOS} multiple className="sr-only" onChange={(e) => { elegirArchivos(e.target.files); e.target.value = ""; }} />
            </label>
            <button type="button" onClick={() => setEscribir((v) => !v)} aria-expanded={escribir}
              className={`flex flex-col items-center gap-1 rounded-xl px-2 py-3 text-xs font-bold ring-1 transition active:scale-[0.97] motion-reduce:active:scale-100 ${escribir ? "bg-accent text-ink ring-accent" : "bg-white/10 ring-white/20 hover:bg-white/20"}`}>
              <span className="text-xl" aria-hidden>✍️</span> Escribir
            </button>
          </div>
          <p className="relative mt-2 text-center text-[11px] text-white/60">Fotos, PDF, Excel, Word o CSV · los archivos quedan guardados en tu Drive</p>

          {escribir && (
            <div className="relative mt-3 animate-fade-in motion-reduce:animate-none">
              <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} autoFocus aria-label="Escribí la compra"
                placeholder={"Ej: El Nogal, 3 creatinas ENA 300 g a $15.121,80 c/u, 2 whey Star vainilla 1 kg a $28.500, pagué por transferencia"}
                className="w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent" />
              <button type="button" onClick={leerTexto} disabled={!texto.trim()}
                className="mt-2 w-full rounded-xl bg-accent py-2.5 text-sm font-black text-ink transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50 motion-reduce:active:scale-100">
                Cargar estos productos
              </button>
            </div>
          )}

          {lecturas.length > 0 && (
            <ul className="relative mt-3 space-y-1.5">
              {lecturas.map((l) => (
                <li key={l.id} className="flex items-center gap-3 rounded-xl bg-white/10 px-2.5 py-2 ring-1 ring-white/15">
                  {l.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={l.preview} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15 text-base">{l.entrada.texto ? "✍️" : "📄"}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{l.nombre}</p>
                    <p className={`text-[11px] ${l.estado === "error" ? "text-amber-200" : "text-white/70"}`} aria-live="polite">
                      {l.estado === "leyendo" ? "Leyendo… puede tardar unos segundos" : l.detalle}
                    </p>
                  </div>
                  {l.estado === "leyendo" && <span aria-hidden className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-accent motion-reduce:animate-none" />}
                  {l.estado === "listo" && <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-ink"><CheckIcon className="h-4 w-4" /></span>}
                  {l.estado === "error" && (
                    <button type="button" onClick={() => procesar(l.entrada, l.nombre, l.id)} className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-primary">
                      Reintentar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {aviso && (
          <div className="animate-fade-in space-y-1.5 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800 motion-reduce:animate-none" role="status">
            <p className="font-semibold">✓ Cargué {aviso.n} {aviso.n === 1 ? "producto" : "productos"} de “{aviso.fuente}”. Revisalos antes de guardar.</p>
            {diferencia && (
              <p className="rounded-lg bg-amber-50 px-2 py-1.5 text-xs font-semibold text-amber-800">
                El total del comprobante es {pesos(aviso.total)} y la suma da {pesos(total)}: revisá cantidades y precios.
              </p>
            )}
            {aviso.dudas && <p className="text-xs text-green-900/80">Para revisar: {aviso.dudas}</p>}
          </div>
        )}

        {/* Datos de la compra */}
        <section className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-white p-3">
          <label className="block"><span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">Fecha</span>
            <input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setFechaTocada(true); }} className="input h-11 text-base" /></label>
          <label className="block"><span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">Proveedor <span className="text-sale">*</span></span>
            <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} required placeholder="Ej: El Nogal" className="input h-11 text-base" /></label>
        </section>

        {/* Productos */}
        <section>
          <div className="mb-2 flex items-end justify-between gap-2">
            <h4 className="font-display text-base font-bold text-ink">Productos</h4>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{conProducto} {conProducto === 1 ? "producto" : "productos"} · {unidades} u.</span>
          </div>
          <datalist id="marcas-compra">{marcas.map((m) => <option key={m} value={m} />)}</datalist>
          <ul className="space-y-2.5">
            {items.map((it, k) => {
              const cat = catDe(it);
              return (
                <li key={k} className={`rounded-2xl border bg-white p-3 shadow-sm transition-colors ${it.ia ? "border-accent ring-2 ring-accent/40" : "border-line"}`}>
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-black text-white">{k + 1}</span>
                    <input list="marcas-compra" value={it.marca} onChange={(e) => set(k, "marca", e.target.value)} placeholder="Marca" aria-label="Marca"
                      className="h-9 min-w-0 flex-1 rounded-lg border border-transparent bg-page-soft px-3 text-xs font-bold uppercase tracking-wide text-primary placeholder:font-semibold placeholder:normal-case placeholder:tracking-normal placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30" />
                    <button type="button" onClick={() => setItems((p) => (p.length > 1 ? p.filter((_, i) => i !== k) : [vacio()]))} aria-label="Quitar producto"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sale transition hover:bg-sale/10">
                      <TrashIcon className="h-[18px] w-[18px]" />
                    </button>
                  </div>
                  <input value={it.producto} onChange={(e) => set(k, "producto", e.target.value)} placeholder="Producto (ej: Whey Protein 2 lb Vainilla)" aria-label="Producto"
                    className="input mt-2 h-11 text-[15px] font-semibold" />
                  <div className="mt-2 grid grid-cols-[auto_1fr] items-center gap-2">
                    <div className="flex h-11 items-center rounded-full border border-line bg-white">
                      <button type="button" onClick={() => sumar(k, -1)} aria-label="Una unidad menos" className="grid h-11 w-10 place-items-center text-primary"><MinusIcon className="h-4 w-4" /></button>
                      <input inputMode="numeric" value={it.cantidad} onChange={(e) => set(k, "cantidad", e.target.value.replace(/\D/g, ""))} aria-label="Unidades"
                        className="h-11 w-10 bg-transparent text-center text-base font-bold text-ink focus:outline-none" />
                      <button type="button" onClick={() => sumar(k, 1)} aria-label="Una unidad más" className="grid h-11 w-10 place-items-center text-primary"><PlusIcon className="h-4 w-4" /></button>
                    </div>
                    <MoneyInput value={it.precio.trim() === "" ? "" : num(it.precio)} onChange={(n) => set(k, "precio", n === "" ? "" : String(n))}
                      decimales={2} placeholder="Precio c/u" aria-label="Precio por unidad" className="input h-11 w-full text-base" />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 border-t border-line/70 pt-2">
                    <span className="text-xs text-muted">Subtotal</span>
                    <span className="font-display text-base font-black text-ink">{pesos((Number(it.cantidad) || 0) * num(it.precio))}</span>
                  </div>
                  <PrecioPorCaja producto={it.producto} precio={num(it.precio)} />
                  {sumaStock && (
                    <label className="mt-1.5 block">
                      <span className="sr-only">Sumar al stock de</span>
                      <select value={cat} onChange={(e) => set(k, "cat", e.target.value)}
                        className={`h-10 w-full rounded-full border px-3 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-accent/40 ${cat === NUEVO ? "border-amber-300 bg-amber-50 text-amber-900" : cat ? "border-green-300 bg-green-50 text-green-800" : "border-line bg-page-soft text-muted"}`}>
                        <option value="">No sumar al stock</option>
                        {it.producto.trim() && <option value={NUEVO}>➕ Producto nuevo: {it.producto.trim()}</option>}
                        {opciones.map((o) => <option key={o.value} value={o.value}>✓ Suma stock a: {o.label}</option>)}
                      </select>
                      {cat === NUEVO && <span className="mt-1 block px-1 text-[11px] text-muted">Se crea en Productos (sin foto ni precio, no se ve en la tienda hasta que lo completes).</span>}
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={() => setItems((p) => [...p, vacio()])}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-primary/25 py-3 text-sm font-bold text-primary transition hover:border-primary/50 hover:bg-white">
            <PlusIcon className="h-4 w-4" /> Agregar producto
          </button>
        </section>

        {!sumaStock && (
          <p className="rounded-lg bg-page-soft px-3 py-2 text-xs text-muted">Esta compra se cargó antes de que las compras sumaran stock: editarla no cambia el stock.</p>
        )}

        <fieldset>
          <legend className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">Forma de pago</legend>
          <div className="flex flex-wrap gap-2">
            {PAGOS.map((o) => (
              <button key={o} type="button" onClick={() => setPago((p) => (p === o ? "" : o))} aria-pressed={pago === o}
                className={`rounded-full px-3.5 py-2 text-sm font-semibold transition active:scale-[0.97] motion-reduce:active:scale-100 ${pago === o ? "bg-primary text-white shadow-soft" : "border border-line bg-white text-ink hover:border-primary/40"}`}>
                {o}
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block"><span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-muted">Notas</span>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="input py-2.5 text-base" /></label>

        {archivos.length > 0 && <Adjuntos archivos={archivos} onQuitar={(id) => setArchivos((a) => a.filter((x) => x.id !== id))} />}

        {elegirSuma && (
          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${sumarAhora ? "border-amber-300 bg-amber-50" : "border-line bg-white"}`}>
            <input type="checkbox" checked={sumarAhora} onChange={(e) => setSumarAhora(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--color-primary))]" />
            <span className="text-sm">
              <span className="block font-semibold text-ink">Sumar al stock al guardar</span>
              <span className="block text-xs text-muted">
                {sumarAhora
                  ? "Las unidades se suman al stock de la tienda apenas guardes."
                  : "Queda pendiente: revisala tranquilo y después la sumás desde el detalle con «Sumar al stock»."}
              </span>
            </span>
          </label>
        )}

        <div className="sticky -bottom-5 -mx-5 border-t border-line bg-page/95 px-5 pb-5 pt-3 backdrop-blur">
          <div className="mb-3 flex items-center justify-between rounded-xl bg-accent-soft px-4 py-2.5">
            <span className="text-sm font-semibold text-ink">{unidades} {unidades === 1 ? "unidad" : "unidades"} · Total</span>
            <span className="font-display text-xl font-black text-primary">{pesos(total)}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onClose} className="btn btn-outline btn-md">Cancelar</button>
            <button type="submit" disabled={saving || leyendo || !proveedor.trim()} className="btn btn-primary btn-md">
              {saving ? "Guardando…" : leyendo ? "Leyendo…" : "Guardar compra"}
            </button>
          </div>
        </div>
      </div>
    </Hoja>
  );
}

/** Lista de fotos y archivos guardados en Drive (se abren con tu cuenta de Google). */
function Adjuntos({ archivos, onQuitar }: { archivos: ArchivoCompra[]; onQuitar?: (id: string) => void }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted">📎 Fotos y archivos</p>
      <ul className="space-y-1.5">
        {archivos.map((a) => (
          <li key={a.id} className="flex items-center gap-2 text-sm">
            <span aria-hidden>{a.tipo.startsWith("image/") ? "🖼️" : a.tipo === "application/pdf" ? "📕" : "📄"}</span>
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate font-semibold text-primary underline-offset-2 hover:underline">{a.nombre}</a>
            {onQuitar && (
              <button type="button" onClick={() => onQuitar(a.id)} aria-label={`Quitar ${a.nombre} de la compra`} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-page-soft hover:text-sale">
                <CloseIcon className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
