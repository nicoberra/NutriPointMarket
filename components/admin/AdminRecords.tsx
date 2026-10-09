"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "./useConfirm";
import { OrderSheet } from "./OrderSheet";
import { listTable, addRow, updateRow, deleteRow, aprobarPedido, localAsset } from "@/lib/api";
import { useProducts } from "@/context/ProductsContext";
import { whatsappLink } from "@/lib/config";
import { formatPrice } from "@/lib/format";
import {
  CloseIcon,
  PlusIcon,
  ArrowRightIcon,
  WhatsappIcon,
  CheckIcon,
  SearchIcon,
  TrashIcon,
} from "@/components/Icons";

export interface FieldDef {
  key: string;
  label: string;
  type?: "text" | "tel" | "number" | "date" | "textarea" | "select";
  required?: boolean;
  /** Opciones para type "select" */
  options?: string[];
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
  /** Muestra botón "Aprobar pago" que descuenta stock (para Pedidos) */
  aprobar?: boolean;
  /** Permite eliminar la fila */
  deletable?: boolean;
  /** Permite abrir el detalle completo (para Pedidos) */
  detail?: boolean;
  /** Etiqueta opcional (ej: "Web" para clientes registrados desde la tienda) */
  tag?: (r: Record<string, string>) => string | undefined;
  /** Divide en dos solapas por origen web (para Clientes) */
  segments?: { mineLabel: string; webLabel: string };
  /** Muestra buscador */
  searchable?: boolean;
  searchPlaceholder?: string;
}

/** ¿La fila vino de un registro de la web? (origen === "web") */
function isWebRow(r: Record<string, string>): boolean {
  return String(r.origen ?? "").trim().toLowerCase() === "web";
}

type Row = Record<string, string>;

export function AdminRecords({
  config,
  onToast,
  orderConfig,
}: {
  config: RecordsConfig;
  onToast: (m: string) => void;
  /** Config de Pedidos (para crear un pedido desde la ficha de un cliente) */
  orderConfig?: RecordsConfig;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seg, setSeg] = useState<"mine" | "web">("mine");
  const [q, setQ] = useState("");
  const [detailRow, setDetailRow] = useState<Row | null>(null);
  const { confirm, dialog } = useConfirm();

  // Clientes: sus pedidos (para contar y listar), ficha, edición y nuevo pedido
  const isClientes = config.tab === "Clientes";
  const [pedidos, setPedidos] = useState<Row[]>([]);
  const [clientRow, setClientRow] = useState<Row | null>(null);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [orderFor, setOrderFor] = useState<Row | null>(null);
  const loadPedidos = () => {
    if (!isClientes) return;
    listTable<Row>("Pedidos")
      .then((d) => setPedidos([...d].reverse()))
      .catch(() => {});
  };
  useEffect(loadPedidos, [config.tab]); // eslint-disable-line react-hooks/exhaustive-deps
  // Cruce cliente ↔ pedidos: por teléfono (últimos 10 dígitos) o por nombre exacto
  const normTel = (v?: string) => String(v ?? "").replace(/\D/g, "").replace(/^549?/, "").replace(/^0/, "").slice(-10);
  const ordersOf = (c: Row): Row[] => {
    const tel = normTel(c.telefono);
    const name = String(c.nombre ?? "").trim().toLowerCase();
    return pedidos.filter(
      (p) =>
        (tel.length >= 8 && normTel(p.telefono) === tel) ||
        (name !== "" && String(p.cliente ?? "").trim().toLowerCase() === name),
    );
  };
  const openRow = (r: Row) => (config.detail ? setDetailRow(r) : setClientRow(r));

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

  // Todas las acciones con try/catch: si la planilla tarda o falla, avisa y
  // recarga (para volver a la verdad) en vez de quedar trabado o mentir.
  const handleAdd = async (obj: Row) => {
    setSaving(true);
    try {
      const ok = await addRow(config.tab, obj);
      setAdding(false);
      onToast(ok ? "Guardado ✓" : "No se pudo guardar (reintentá)");
    } catch {
      onToast("Tardó demasiado: verificá si se guardó");
    } finally {
      setSaving(false);
    }
    // recargar tras un momento (la escritura es asíncrona)
    setTimeout(load, 1200);
  };

  const handleEdit = async (obj: Row) => {
    if (!editRow) return;
    setSaving(true);
    try {
      const r = await updateRow(config.tab, editRow.id, obj);
      onToast(r === false ? "No se pudo guardar (reintentá)" : "Datos actualizados ✓");
      setEditRow(null);
      setClientRow((c) => (c && c.id === editRow.id ? { ...c, ...obj } : c));
    } catch {
      onToast("Tardó demasiado: verificá si se guardó");
    } finally {
      setSaving(false);
    }
    setTimeout(load, 1200);
  };

  const handleAddOrder = async (obj: Row) => {
    if (!orderConfig) return;
    setSaving(true);
    try {
      const ok = await addRow(orderConfig.tab, obj);
      onToast(ok ? "Pedido creado ✓" : "No se pudo guardar (reintentá)");
      setOrderFor(null);
    } catch {
      onToast("Tardó demasiado: verificá si se guardó");
    } finally {
      setSaving(false);
    }
    setTimeout(loadPedidos, 1200);
  };

  const toggleEstado = async (row: Row) => {
    const nuevo = row.estado === "Entregado" ? "Pendiente" : "Entregado";
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, estado: nuevo } : r)),
    );
    try {
      const r = await updateRow(config.tab, row.id, { estado: nuevo });
      if (r === false) throw new Error("no ok");
    } catch {
      onToast("No se pudo cambiar el estado (reintentá)");
      load();
    }
  };

  const eliminar = async (row: Row) => {
    if (
      !(await confirm({
        title: "¿Eliminar este registro?",
        message:
          row.descontado === "sí"
            ? "El stock de sus productos se repone. No se puede deshacer."
            : "No se puede deshacer.",
      }))
    )
      return;
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    try {
      await deleteRow(config.tab, row.id);
      // El backend repone el stock si el pago ya estaba aprobado (descontado).
      onToast(
        row.descontado === "sí"
          ? "Pedido eliminado · stock repuesto ✓"
          : isClientes
            ? "Cliente eliminado ✓"
            : "Pedido eliminado ✓",
      );
    } catch {
      onToast("No se pudo eliminar (reintentá)");
      load();
    }
  };

  const aprobarPago = async (row: Row) => {
    onToast("Aprobando y descontando stock… ⏳");
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, descontado: "sí", estado: "pagado" } : r)),
    );
    try {
      const ok = await aprobarPedido(row.id);
      onToast(ok ? "Pago aprobado · stock descontado ✓" : "No se pudo aprobar");
      if (!ok) load();
    } catch {
      onToast("Tardó demasiado: verificá el pedido");
      load();
    }
  };

  // Solapas por origen (Mis usuarios / Usuarios web)
  const mineRows = config.segments ? rows.filter((r) => !isWebRow(r)) : rows;
  const webRows = config.segments ? rows.filter(isWebRow) : [];
  const base = config.segments ? (seg === "web" ? webRows : mineRows) : rows;

  // Buscador
  const query = q.trim().toLowerCase();
  const visible =
    config.searchable && query
      ? base.filter((r) =>
          `${config.primary(r)} ${config.secondary(r)}`.toLowerCase().includes(query),
        )
      : base;

  return (
    <div className="space-y-3">
      {config.segments && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSeg("mine")}
            className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
              seg === "mine"
                ? "border-primary bg-primary text-white"
                : "border-line bg-white text-muted"
            }`}
          >
            {config.segments.mineLabel}{" "}
            <span className={seg === "mine" ? "text-white/70" : "text-muted"}>
              ({mineRows.length})
            </span>
          </button>
          <button
            onClick={() => setSeg("web")}
            className={`rounded-xl border px-3 py-2.5 text-sm font-bold transition-colors ${
              seg === "web"
                ? "border-primary bg-primary text-white"
                : "border-line bg-white text-muted"
            }`}
          >
            {config.segments.webLabel}{" "}
            <span className={seg === "web" ? "text-white/70" : "text-muted"}>
              ({webRows.length})
            </span>
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
        <button
          onClick={() => setAdding(true)}
          className="btn btn-primary btn-md w-full sm:w-auto sm:shrink-0"
        >
          <PlusIcon className="h-5 w-5" /> {config.addLabel}
        </button>
        {config.searchable && (
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={config.searchPlaceholder ?? "Buscar…"}
              className="input h-11 pl-9 text-base"
            />
          </div>
        )}
      </div>

      {config.searchable && query && !loading && (
        <p className="px-1 text-xs font-semibold text-muted" aria-live="polite">
          {visible.length} {visible.length === 1 ? "resultado" : "resultados"} para “{q.trim()}”
        </p>
      )}

      {loading ? (
        <ul className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0 xl:grid-cols-3" aria-busy="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <li key={i} className="h-[76px] animate-pulse rounded-xl border border-line bg-white motion-reduce:animate-none" />
          ))}
        </ul>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-white py-12 text-center text-sm text-muted">
          {query
            ? "No hay resultados para la búsqueda."
            : config.segments && seg === "web"
              ? "Todavía nadie se registró desde la web."
              : "Todavía no hay registros."}
        </div>
      ) : (
        <ul className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0 xl:grid-cols-3">
          {visible.map((r, i) => (
            <li
              key={r.id || i}
              onClick={() => (config.detail || isClientes) && openRow(r)}
              style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
              className={`flex animate-section-in items-center gap-3 rounded-xl border border-line bg-white p-3 motion-reduce:animate-none ${
                config.detail || isClientes ? "cursor-pointer transition-colors hover:border-accent" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  {config.detail || isClientes ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openRow(r);
                      }}
                      className="truncate text-left hover:text-primary hover:underline"
                    >
                      {config.primary(r) || "—"}
                    </button>
                  ) : (
                    <span className="truncate">{config.primary(r) || "—"}</span>
                  )}
                  {config.tag?.(r) && (
                    <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      {config.tag(r)}
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-muted">{config.secondary(r)}</p>
                {isClientes &&
                  (() => {
                    const n = ordersOf(r).length;
                    return (
                      <span
                        className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                          n ? "bg-accent/15 text-primary" : "bg-page-soft text-muted"
                        }`}
                      >
                        {n === 0 ? "Sin pedidos" : n === 1 ? "1 pedido" : `${n} pedidos`}
                      </span>
                    );
                  })()}
                {config.estado && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleEstado(r);
                    }}
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
                {config.aprobar &&
                  (() => {
                    const esTransfer = (r.pago || "").toLowerCase().includes("transfer");
                    const faltaComprobante = esTransfer && !r.comprobante;
                    if (r.descontado === "sí")
                      return (
                        <span className="ml-1.5 mt-1.5 inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-700">
                          <CheckIcon className="h-3.5 w-3.5" /> Pago aprobado
                        </span>
                      );
                    if (faltaComprobante)
                      return (
                        <span className="ml-1.5 mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                          Falta comprobante
                        </span>
                      );
                    return (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          aprobarPago(r);
                        }}
                        className="ml-1.5 mt-1.5 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white hover:brightness-110"
                      >
                        {esTransfer ? "Comprobante ✓ · Aprobar" : "Aprobar pago"}
                      </button>
                    );
                  })()}
              </div>
              {r.telefono && (
                <a
                  href={whatsappLink(`Hola ${r.cliente || r.nombre || ""}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                  onClick={(e) => e.stopPropagation()}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#25D366]/10 text-[#25D366]"
                >
                  <WhatsappIcon className="h-5 w-5" />
                </a>
              )}
              {config.deletable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    eliminar(r);
                  }}
                  aria-label="Eliminar"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sale hover:bg-sale/10"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding &&
        (config.tab === "Pedidos" ? (
          <OrderSheet saving={saving} onClose={() => setAdding(false)} onSave={handleAdd} />
        ) : (
          <AddSheet config={config} saving={saving} onClose={() => setAdding(false)} onSave={handleAdd} />
        ))}

      {editRow && (
        <AddSheet
          config={config}
          saving={saving}
          initial={editRow}
          title="Editar cliente"
          onClose={() => setEditRow(null)}
          onSave={handleEdit}
        />
      )}
      {orderFor && orderConfig && (
        <OrderSheet
          initial={{ cliente: orderFor.nombre ?? "", telefono: orderFor.telefono ?? "" }}
          saving={saving}
          onClose={() => setOrderFor(null)}
          onSave={handleAddOrder}
        />
      )}
      {clientRow && !orderFor && !editRow && (
        <ClientSheet
          row={clientRow}
          orders={ordersOf(clientRow)}
          canOrder={!!orderConfig}
          onClose={() => setClientRow(null)}
          onNewOrder={() => setOrderFor(clientRow)}
          onEdit={() => setEditRow(clientRow)}
          onDelete={async () => {
            const c = clientRow;
            setClientRow(null);
            await eliminar(c);
          }}
          onOpenOrder={(p) => setDetailRow(p)}
        />
      )}

      {dialog}
      {detailRow && <DetailSheet row={detailRow} onClose={() => setDetailRow(null)} />}
    </div>
  );
}

/* ------------------------- Detalle de un pedido --------------------------- */

function DetailSheet({ row, onClose }: { row: Row; onClose: () => void }) {
  const { products } = useProducts();
  const [foto, setFoto] = useState(false);
  let items: { n: string; v?: string; q: number; cv?: Record<string, string> }[] = [];
  try {
    items = JSON.parse(row.items || "[]");
  } catch {
    /* ignore */
  }
  const brandOf = (n: string) => products.find((p) => p.name === n)?.brand || "";
  // La foto se sirve desde el dominio propio; si todavía no se publicó
  // (recién subida), cae a la URL de GitHub.
  const compLocal = localAsset(row.comprobante);
  const email = (row.notas || "").match(/Email:\s*([^\s|]+)/i)?.[1] || "";
  const esTransfer = (row.pago || "").toLowerCase().includes("transfer");

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 animate-fade-in bg-black/50 motion-reduce:animate-none" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-md animate-section-in overflow-y-auto rounded-t-2xl bg-page p-5 motion-reduce:animate-none sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-primary">Detalle del pedido</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 place-items-center rounded-full text-ink hover:bg-page-soft"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <DetailBox title="Cliente">
            <DetailLine k="Nombre" v={row.cliente} />
            <DetailLine k="Teléfono" v={row.telefono} />
            {email && <DetailLine k="Email" v={email} />}
            <DetailLine k="Fecha" v={row.fecha} />
          </DetailBox>

          <DetailBox title="Pago y envío">
            <DetailLine k="Forma de pago" v={row.pago} />
            <DetailLine
              k="Estado"
              v={row.descontado === "sí" ? "Pagado · stock descontado" : row.estado || "Pendiente"}
            />
            <DetailLine k="Envío" v={row.envio} />
          </DetailBox>

          <DetailBox title="Productos">
            {items.length ? (
              <ul className="space-y-1">
                {items.map((it, i) => {
                  const brand = brandOf(it.n);
                  return (
                    <li key={i} className="text-ink">
                      <span className="font-semibold">{it.q}×</span>{" "}
                      {brand && (
                        <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
                          {brand} ·{" "}
                        </span>
                      )}
                      {it.n}
                      {it.v ? ` · ${it.v}` : ""}
                      {it.cv && (
                        <span className="block text-xs text-muted">
                          {Object.entries(it.cv)
                            .map(([n, v]) => `${n}: ${v}`)
                            .join(" · ")}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted">{row.detalle || "—"}</p>
            )}
          </DetailBox>

          <DetailBox title="Totales">
            {Number(row.montoEnvio) > 0 && (
              <DetailLine k="Envío" v={formatPrice(Number(row.montoEnvio))} />
            )}
            <DetailLine k="Total" v={formatPrice(Number(row.monto) || 0)} />
            {esTransfer && (
              <p className="mt-1 text-xs font-semibold text-secondary">
                Incluye 10% de descuento por transferencia.
              </p>
            )}
          </DetailBox>

          {esTransfer && (
            <DetailBox title="Comprobante de transferencia">
              {row.comprobante ? (
                <>
                  <button
                    type="button"
                    onClick={() => setFoto(true)}
                    className="btn btn-secondary btn-md w-full font-bold"
                  >
                    📷 Ver foto del comprobante
                  </button>
                  <a
                    href={row.comprobante}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 block text-center text-xs font-semibold text-primary underline"
                  >
                    Abrir en pestaña nueva
                  </a>
                </>
              ) : (
                <p className="font-semibold text-sale">
                  ⚠️ Todavía no subió el comprobante.
                </p>
              )}
            </DetailBox>
          )}

          {row.notas && (
            <DetailBox title="Notas">
              <p className="text-muted">{row.notas}</p>
            </DetailBox>
          )}
        </div>
      </div>

      {/* Foto del comprobante a pantalla completa */}
      {foto && row.comprobante && (
        <div
          className="fixed inset-0 z-[99] flex items-center justify-center bg-black/85 p-3"
          onClick={() => setFoto(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={compLocal}
            alt="Comprobante"
            onError={(e) => {
              if (e.currentTarget.src !== row.comprobante) e.currentTarget.src = row.comprobante;
            }}
            className="max-h-[92vh] max-w-full rounded-lg object-contain"
          />
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setFoto(false)}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white text-ink"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function DetailBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">{title}</p>
      {children}
    </div>
  );
}

function DetailLine({ k, v }: { k: string; v?: string }) {
  if (!v) return null;
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-muted">{k}</span>
      <span className="text-right font-medium text-ink">{v}</span>
    </div>
  );
}

function AddSheet({
  config,
  saving,
  onClose,
  onSave,
  initial,
  title,
}: {
  config: RecordsConfig;
  saving: boolean;
  onClose: () => void;
  onSave: (r: Row) => void;
  /** Valores iniciales (editar un registro o pre-cargar el cliente) */
  initial?: Row;
  title?: string;
}) {
  const [form, setForm] = useState<Row>(() => {
    const base: Row = {};
    for (const f of config.fields) if (initial?.[f.key] != null) base[f.key] = String(initial[f.key]);
    return base;
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 animate-fade-in bg-black/50 motion-reduce:animate-none" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative max-h-[92vh] w-full max-w-md animate-section-in overflow-y-auto rounded-t-2xl bg-page p-5 motion-reduce:animate-none sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-primary">
            {title ?? config.addLabel}
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
              ) : f.type === "select" ? (
                <select
                  required={f.required}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                  className="input h-11 text-base"
                >
                  <option value="">Elegí una opción…</option>
                  {(f.options ?? []).map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
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

/* -------------------------- Ficha de un cliente --------------------------- */

function ClientSheet({
  row,
  orders,
  canOrder,
  onClose,
  onNewOrder,
  onEdit,
  onDelete,
  onOpenOrder,
}: {
  row: Row;
  orders: Row[];
  canOrder: boolean;
  onClose: () => void;
  onNewOrder: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenOrder: (p: Row) => void;
}) {
  const tel = String(row.telefono ?? "").replace(/\D/g, "");
  const wa = tel ? "https://wa.me/" + (tel.startsWith("54") ? tel : "549" + tel.replace(/^0/, "")) : "";
  const esWeb = String(row.origen ?? "").trim().toLowerCase() === "web";
  const datos: [string, string | undefined][] = [
    ["Teléfono", row.telefono],
    ["Email", row.email],
    ["Ciudad", row.ciudad],
    ["Dirección", row.direccion],
    ["DNI / CUIT", row.dni],
    ["Notas", row.notas],
  ];
  // Resumen del pedido: primer ítem (o el detalle) + cantidad de ítems
  const resumen = (p: Row) => {
    try {
      const items = JSON.parse(p.items || "[]") as { n: string; q: number }[];
      if (items.length) {
        const first = `${items[0].q}x ${items[0].n}`;
        return items.length > 1 ? `${first} +${items.length - 1}` : first;
      }
    } catch {
      /* sin items en JSON */
    }
    return p.detalle || "Pedido";
  };
  const estadoDe = (p: Row) =>
    p.descontado === "sí" || String(p.estado).toLowerCase() === "pagado"
      ? { t: "Pagado", c: "bg-green-100 text-green-700" }
      : p.estado === "Entregado"
        ? { t: "Entregado", c: "bg-accent/15 text-primary" }
        : { t: p.estado || "Pendiente", c: "bg-amber-100 text-amber-700" };

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 animate-fade-in bg-black/50 motion-reduce:animate-none" onClick={onClose} />
      <div className="relative max-h-[92vh] w-full max-w-md animate-section-in overflow-y-auto rounded-t-2xl bg-page p-5 motion-reduce:animate-none sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="truncate font-display text-xl font-bold text-primary">{row.nombre || "Cliente"}</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink hover:bg-page-soft"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="divide-y divide-line rounded-xl border border-line bg-white px-4 text-sm">
          {datos
            .filter(([, v]) => String(v ?? "").trim() !== "")
            .map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-4 py-2.5">
                <span className="shrink-0 text-muted">{k}</span>
                <span className="text-right font-semibold text-ink">{v}</span>
              </div>
            ))}
          {datos.every(([, v]) => String(v ?? "").trim() === "") && (
            <p className="py-3 text-muted">Sin datos cargados.</p>
          )}
        </div>

        <p className="mt-3 text-xs font-semibold text-muted">
          {esWeb ? "🌐 Registrado desde la web" : "✍️ Cargado por vos"}
          {row.fecha ? ` · ${row.fecha}` : ""}
        </p>

        <div className="mt-3 flex items-stretch gap-2">
          {canOrder && (
            <button onClick={onNewOrder} className="btn btn-primary btn-md flex-1">
              <PlusIcon className="h-5 w-5" /> Nuevo pedido
            </button>
          )}
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Escribir por WhatsApp"
              title="WhatsApp"
              className="grid w-12 shrink-0 place-items-center rounded-xl border border-green-200 bg-green-50 text-green-600 hover:bg-green-100"
            >
              <WhatsappIcon className="h-5 w-5" />
            </a>
          )}
          <button
            onClick={onEdit}
            aria-label="Editar datos"
            title="Editar datos"
            className="grid w-12 shrink-0 place-items-center rounded-xl border border-line bg-white text-ink hover:bg-page-soft"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            aria-label="Eliminar cliente"
            title="Eliminar cliente"
            className="grid w-12 shrink-0 place-items-center rounded-xl border border-line bg-white text-sale hover:bg-sale/10"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>

        <h4 className="mb-2 mt-5 font-display text-base font-bold text-primary">
          Historial{" "}
          <span className="text-sm font-semibold text-muted">
            ({orders.length === 0 ? "sin pedidos" : orders.length === 1 ? "1 pedido" : `${orders.length} pedidos`})
          </span>
        </h4>
        {orders.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-white py-4 text-center text-sm text-muted">
            Todavía no tiene pedidos.
          </p>
        ) : (
          <ul className="space-y-2">
            {orders.map((p) => {
              const e = estadoDe(p);
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-white p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{resumen(p)}</p>
                    <p className="text-xs text-muted">
                      {formatPrice(Number(p.monto) || 0)}
                      {p.fecha ? ` · ${p.fecha}` : ""}
                      {" · "}
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${e.c}`}>{e.t}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenOrder(p)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 px-3 py-1 text-xs font-bold text-primary hover:bg-accent-soft"
                  >
                    <ArrowRightIcon className="h-3.5 w-3.5" /> Pedido
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
