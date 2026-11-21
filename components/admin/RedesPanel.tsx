"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  aprobarEnOficina,
  estadoOficina,
  listaSubidos,
  subirPieza,
  tipoArchivo,
  type EstadoOficina,
  type ListaSubidos,
  type PiezaOficina,
  type TipoPieza,
} from "@/lib/redes";
import { useConfirm } from "./useConfirm";

/**
 * Redes: lo mismo que la oficina muestra de Suple Market, desde el CRM.
 * - Para aprobar: lo que espera tu OK (aprobar, sacar o aprobar todo).
 * - Calendario: lo programado. Publicado: lo último que salió.
 * - Subir: historias, posteos y reels al Drive; la oficina los importa cada hora.
 */
type Vista = "aprobar" | "calendario" | "publicado" | "subir";

const VISTAS: { id: Vista; label: string }[] = [
  { id: "aprobar", label: "Aprobar" },
  { id: "calendario", label: "Calendario" },
  { id: "publicado", label: "Publicado" },
  { id: "subir", label: "Subir" },
];

const fechaHora = (iso: string | null) => {
  if (!iso) return "Sin fecha";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Sin fecha";
  return d.toLocaleString("es-AR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

const dia = (iso: string | null) => {
  if (!iso) return "Sin fecha";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Sin fecha";
  const hoy = new Date();
  const man = new Date();
  man.setDate(hoy.getDate() + 1);
  if (d.toDateString() === hoy.toDateString()) return "Hoy";
  if (d.toDateString() === man.toDateString()) return "Mañana";
  return d.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
};

export function RedesPanel({ onToast }: { onToast: (t: string) => void }) {
  const [vista, setVista] = useState<Vista>("aprobar");
  const [estado, setEstado] = useState<EstadoOficina | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    const r = await estadoOficina();
    if (r.ok && r.data) {
      setEstado(r.data);
      setError("");
    } else setError(r.error || "No se pudo leer la oficina");
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const pendientes = estado?.pending.length ?? 0;

  return (
    <div className="space-y-4">
      {/* Selector de vista: se desliza el fondo del activo */}
      <div className="relative grid grid-cols-4 rounded-2xl bg-white p-1 shadow-soft" role="tablist">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-1 left-1 rounded-xl bg-primary transition-transform duration-200 ease-move motion-reduce:transition-none"
          style={{ width: "calc((100% - 0.5rem) / 4)", transform: `translateX(${VISTAS.findIndex((v) => v.id === vista) * 100}%)` }}
        />
        {VISTAS.map((v) => (
          <button
            key={v.id}
            role="tab"
            aria-selected={vista === v.id}
            onClick={() => setVista(v.id)}
            className={`relative z-10 flex min-h-[40px] items-center justify-center gap-1 rounded-xl px-1 text-xs font-bold transition-colors ${
              vista === v.id ? "text-white" : "text-muted"
            }`}
          >
            {v.label}
            {v.id === "aprobar" && pendientes > 0 && (
              <span className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] ${vista === v.id ? "bg-accent text-primary" : "bg-primary text-white"}`}>
                {pendientes}
              </span>
            )}
          </button>
        ))}
      </div>

      {vista !== "subir" && error && !cargando && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-bold">No se pudo conectar con la oficina</p>
          <p className="mt-1 text-xs leading-relaxed">{error}</p>
          <button onClick={cargar} className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-red-700 shadow-soft active:scale-[0.97]">
            Reintentar
          </button>
        </div>
      )}

      <div key={vista} className="animate-section-in motion-reduce:animate-none">
        {vista === "aprobar" && (
          <ParaAprobar estado={estado} cargando={cargando} recargar={cargar} onToast={onToast} quitar={(ids) => setEstado((e) => (e ? { ...e, pending: e.pending.filter((p) => !ids.includes(p.id)) } : e))} />
        )}
        {vista === "calendario" && <Calendario piezas={estado?.upcoming ?? []} cargando={cargando} />}
        {vista === "publicado" && <Publicado piezas={estado?.recent ?? []} cargando={cargando} />}
        {vista === "subir" && <Subir onToast={onToast} />}
      </div>
    </div>
  );
}

/* ------------------------------ Para aprobar ------------------------------ */

function ParaAprobar({
  estado,
  cargando,
  recargar,
  onToast,
  quitar,
}: {
  estado: EstadoOficina | null;
  cargando: boolean;
  recargar: () => Promise<void>;
  onToast: (t: string) => void;
  quitar: (ids: string[]) => void;
}) {
  const { confirm, dialog } = useConfirm();
  const [ocupado, setOcupado] = useState<string>("");
  const piezas = estado?.pending ?? [];

  const accion = async (accion: "approve" | "reject", ids: string[], todas = false) => {
    setOcupado(todas ? "todas" : ids[0]);
    const r = await aprobarEnOficina(accion, todas ? { todas: true } : { ids });
    setOcupado("");
    if (!r.ok) return onToast(r.error || "No se pudo");
    quitar(todas ? piezas.map((p) => p.id) : ids);
    onToast(accion === "approve" ? (todas ? "Todo aprobado" : "Aprobada") : "Sacada del calendario");
    recargar();
  };

  if (cargando && !estado) return <Esqueleto />;
  if (!estado) return null;
  if (!piezas.length)
    return (
      <Vacio
        titulo="Nada esperando tu OK"
        texto="Lo que subas en «Subir» (o al Drive) aparece acá en menos de una hora para que lo apruebes."
      />
    );

  return (
    <div className="space-y-3">
      {dialog}
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-soft">
        <p className="text-sm text-muted">
          <strong className="text-ink">{piezas.length}</strong> {piezas.length === 1 ? "pieza espera" : "piezas esperan"} tu OK
        </p>
        <button
          disabled={!!ocupado}
          onClick={async () => {
            if (await confirm({ title: `¿Aprobar las ${piezas.length}?`, message: "Se publican solas en el día y la hora de cada una.", confirmLabel: "Aprobar todas" }))
              accion("approve", [], true);
          }}
          className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-60"
        >
          {ocupado === "todas" ? "Aprobando…" : "Aprobar todas"}
        </button>
      </div>
      {piezas.map((p) => (
        <TarjetaPieza key={p.id} pieza={p}>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              disabled={!!ocupado}
              onClick={async () => {
                if (await confirm({ title: "¿Sacar esta pieza?", message: "No se publica y sale del calendario de la oficina.", confirmLabel: "Sacar" }))
                  accion("reject", [p.id]);
              }}
              className="min-h-[44px] rounded-xl border border-line bg-white text-sm font-bold text-ink transition-transform active:scale-[0.97] disabled:opacity-60"
            >
              Sacar
            </button>
            <button
              disabled={!!ocupado}
              onClick={() => accion("approve", [p.id])}
              className="min-h-[44px] rounded-xl bg-primary text-sm font-bold text-white transition-transform active:scale-[0.97] disabled:opacity-60"
            >
              {ocupado === p.id ? "Aprobando…" : "Aprobar"}
            </button>
          </div>
        </TarjetaPieza>
      ))}
    </div>
  );
}

/* ------------------------------- Calendario ------------------------------- */

function Calendario({ piezas, cargando }: { piezas: PiezaOficina[]; cargando: boolean }) {
  const dias = useMemo(() => {
    const m = new Map<string, PiezaOficina[]>();
    for (const p of piezas) {
      const k = dia(p.when);
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return Array.from(m.entries());
  }, [piezas]);
  if (cargando && !piezas.length) return <Esqueleto />;
  if (!piezas.length) return <Vacio titulo="No hay nada programado" texto="Cuando apruebes piezas, acá ves qué sale cada día (próximos 14 días)." />;
  return (
    <div className="space-y-4">
      {dias.map(([d, lista]) => (
        <section key={d}>
          <h3 className="mb-2 px-1 text-xs font-bold capitalize text-muted">{d}</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white shadow-soft">
            {lista.map((p) => (
              <li key={p.id} className="flex items-center gap-3 p-3">
                <Miniatura pieza={p} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">
                    {p.label}{" "}
                    <span className="font-normal text-muted">
                      · {p.when ? new Date(p.when).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }) : "sin hora"}
                    </span>
                  </p>
                  {p.caption && <p className="truncate text-xs text-muted">{p.caption}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${p.approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {p.approved ? "Aprobada" : "Sin OK"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* -------------------------------- Publicado ------------------------------- */

function Publicado({ piezas, cargando }: { piezas: PiezaOficina[]; cargando: boolean }) {
  if (cargando && !piezas.length) return <Esqueleto />;
  if (!piezas.length) return <Vacio titulo="Todavía no se publicó nada" texto="Acá aparece lo último que la oficina publicó de Suple Market." />;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white shadow-soft">
      {piezas.map((p) => (
        <li key={p.id} className="flex items-center gap-3 p-3">
          <Miniatura pieza={p} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-ink">{p.label}</p>
            <p className="text-xs text-muted">{fechaHora(p.when)}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${p.status === "failed" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {p.status === "failed" ? "Falló" : "Publicada"}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------- Subir --------------------------------- */

const TIPOS: { id: TipoPieza; label: string; ayuda: string }[] = [
  { id: "historia", label: "Historia", ayuda: "Una foto o un video vertical (9:16)." },
  { id: "posteo", label: "Posteo", ayuda: "Una foto, o de 2 a 10 para un carrusel (en el orden en que las elijas)." },
  { id: "reel", label: "Reel", ayuda: "Un video vertical y, si querés, su portada." },
];

function Subir({ onToast }: { onToast: (t: string) => void }) {
  const [tipo, setTipo] = useState<TipoPieza>("historia");
  const [archivos, setArchivos] = useState<File[]>([]);
  const [portada, setPortada] = useState<File | null>(null);
  const [nombre, setNombre] = useState("");
  const [texto, setTexto] = useState("");
  const [progreso, setProgreso] = useState<number | null>(null);
  const [subidos, setSubidos] = useState<ListaSubidos | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const portadaRef = useRef<HTMLInputElement>(null);

  const leerSubidos = useCallback(async () => {
    const r = await listaSubidos();
    if (r.ok && r.data) setSubidos(r.data);
  }, []);
  useEffect(() => {
    leerSubidos();
  }, [leerSubidos]);

  const limpiar = () => {
    setArchivos([]);
    setPortada(null);
    setNombre("");
    setTexto("");
    if (inputRef.current) inputRef.current.value = "";
    if (portadaRef.current) portadaRef.current.value = "";
  };

  const cambiarTipo = (t: TipoPieza) => {
    if (progreso !== null) return;
    setTipo(t);
    limpiar();
  };

  const elegir = (lista: FileList | null) => {
    const fs = Array.from(lista ?? []);
    if (!fs.length) return;
    const ok = fs.filter((f) => {
      const m = tipoArchivo(f);
      if (tipo === "posteo") return m.startsWith("image/");
      if (tipo === "reel") return m.startsWith("video/");
      return m.startsWith("image/") || m.startsWith("video/");
    });
    if (ok.length < fs.length) onToast(tipo === "posteo" ? "Los posteos son fotos" : tipo === "reel" ? "El reel tiene que ser un video" : "Elegí una foto o un video");
    if (tipo === "posteo") setArchivos((prev) => [...prev, ...ok].slice(0, 10));
    else setArchivos(ok.slice(0, 1));
  };

  const faltaNombre = tipo !== "historia" && !nombre.trim();
  const puede = archivos.length > 0 && !faltaNombre && progreso === null;

  const enviar = async () => {
    if (!puede) return;
    setProgreso(0);
    const r = await subirPieza({ tipo, nombre: nombre.trim(), texto, archivos, portada: tipo === "reel" ? portada : null }, setProgreso);
    setProgreso(null);
    if (!r.ok) return onToast(r.error || "No se pudo subir");
    onToast(`Subido ✓ En menos de una hora aparece en «Aprobar»`);
    limpiar();
    leerSubidos();
  };

  const accept = tipo === "posteo" ? "image/jpeg,image/png,image/webp" : tipo === "reel" ? "video/mp4,video/quicktime" : "image/jpeg,image/png,image/webp,video/mp4,video/quicktime";

  return (
    <div className="space-y-4">
      <section className="space-y-4 rounded-2xl bg-white p-4 shadow-soft">
        <div className="grid grid-cols-3 gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.id}
              onClick={() => cambiarTipo(t.id)}
              aria-pressed={tipo === t.id}
              className={`min-h-[44px] rounded-xl border text-sm font-bold transition-[background-color,color,transform] active:scale-[0.97] ${
                tipo === t.id ? "border-primary bg-primary text-white" : "border-line bg-white text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">{TIPOS.find((t) => t.id === tipo)?.ayuda}</p>

        {/* Archivos elegidos */}
        {archivos.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {archivos.map((f, i) => (
              <Previa
                key={`${f.name}-${f.size}-${i}`}
                file={f}
                numero={tipo === "posteo" && archivos.length > 1 ? i + 1 : undefined}
                quitar={progreso === null ? () => setArchivos((a) => a.filter((_, j) => j !== i)) : undefined}
              />
            ))}
          </div>
        )}

        <input ref={inputRef} type="file" accept={accept} multiple={tipo === "posteo"} className="hidden" onChange={(e) => { elegir(e.target.files); e.target.value = ""; }} />
        {(tipo === "posteo" ? archivos.length < 10 : archivos.length === 0) && (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={progreso !== null}
            className="flex min-h-[88px] w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line text-sm font-bold text-primary transition-colors hover:bg-page-soft active:scale-[0.99] disabled:opacity-60"
          >
            <span aria-hidden className="text-2xl leading-none">＋</span>
            {tipo === "historia" ? "Elegir foto o video" : tipo === "reel" ? "Elegir video" : archivos.length ? "Agregar más fotos" : "Elegir fotos"}
          </button>
        )}

        {tipo === "reel" && (
          <div>
            <input ref={portadaRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => setPortada(e.target.files?.[0] ?? null)} />
            {portada ? (
              <div className="flex items-center gap-3">
                <Previa file={portada} quitar={progreso === null ? () => setPortada(null) : undefined} />
                <p className="text-xs text-muted">Portada del reel</p>
              </div>
            ) : (
              <button onClick={() => portadaRef.current?.click()} disabled={progreso !== null} className="text-sm font-bold text-primary underline-offset-2 hover:underline">
                Agregar portada (opcional)
              </button>
            )}
          </div>
        )}

        {tipo !== "historia" && (
          <>
            <label className="block">
              <span className="text-xs font-bold text-ink">Nombre</span>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                maxLength={80}
                placeholder={tipo === "reel" ? "Ej.: Reel creatina cómo tomarla" : "Ej.: Combo Granger"}
                className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-base outline-none focus:border-primary"
              />
              <span className="mt-1 block text-[11px] text-muted">Solo para encontrarlo en el Drive; no se publica.</span>
            </label>
            <label className="block">
              <span className="text-xs font-bold text-ink">Texto para publicar</span>
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                maxLength={2200}
                rows={4}
                placeholder="El texto que acompaña la publicación (opcional)."
                className="mt-1 w-full resize-y rounded-xl border border-line px-3 py-2.5 text-base outline-none focus:border-primary"
              />
            </label>
          </>
        )}

        {progreso !== null && (
          <div aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-page-soft">
              <div className="h-full origin-left rounded-full bg-primary transition-transform duration-300 motion-reduce:transition-none" style={{ transform: `scaleX(${Math.max(0.02, progreso)})` }} />
            </div>
            <p className="mt-1 text-xs text-muted">Subiendo… {Math.round(progreso * 100)}% (no cierres el CRM)</p>
          </div>
        )}

        <button
          onClick={enviar}
          disabled={!puede}
          className="min-h-[48px] w-full rounded-xl bg-primary text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {progreso !== null ? "Subiendo…" : `Subir ${TIPOS.find((t) => t.id === tipo)?.label.toLowerCase()}`}
        </button>
        {faltaNombre && archivos.length > 0 && <p className="-mt-2 text-center text-xs text-muted">Poné un nombre para subirlo.</p>}
      </section>

      <section>
        <h3 className="mb-2 px-1 text-xs font-bold text-muted">Ya subido al Drive ({TIPOS.find((t) => t.id === tipo)?.label.toLowerCase()})</h3>
        {!subidos ? (
          <Esqueleto filas={2} />
        ) : subidos[tipo].length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-sm text-muted shadow-soft">Todavía no hay nada en esta carpeta.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-white shadow-soft">
            {subidos[tipo].map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 active:bg-page-soft">
                  <span aria-hidden className="text-lg">{s.carpeta ? "🗂️" : s.video ? "🎬" : "🖼️"}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{s.nombre}</span>
                  <span className="shrink-0 text-[11px] text-muted">{new Date(s.fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

/* ------------------------------- Piezas UI -------------------------------- */

function TarjetaPieza({ pieza, children }: { pieza: PiezaOficina; children?: React.ReactNode }) {
  const [abierto, setAbierto] = useState(false);
  const vertical = pieza.label === "Historia" || pieza.label === "Reel";
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-soft">
      <div className={`relative bg-page-soft ${vertical ? "mx-auto aspect-[9/16] w-full max-w-[calc(70vh*9/16)]" : "aspect-[4/5]"}`}>
        {pieza.video ? (
          <video src={pieza.video} poster={pieza.previews[0]} playsInline controls preload="metadata" className="h-full w-full object-contain" />
        ) : pieza.previews.length > 1 ? (
          <div className="flex h-full snap-x snap-mandatory overflow-x-auto">
            {pieza.previews.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt={`${pieza.label} ${i + 1} de ${pieza.previews.length}`} loading="lazy" className="h-full w-full shrink-0 snap-center object-contain" />
            ))}
          </div>
        ) : pieza.previews[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pieza.previews[0]} alt={pieza.label} loading="lazy" className="h-full w-full object-contain" />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted">Sin vista previa</div>
        )}
        {pieza.previews.length > 1 && !pieza.video && (
          <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">{pieza.previews.length} fotos · deslizá</span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-ink">{pieza.label}</p>
          <p className="text-xs capitalize text-muted">{fechaHora(pieza.when)}</p>
        </div>
        {pieza.caption && (
          <button onClick={() => setAbierto((v) => !v)} className="mt-1 block w-full text-left">
            <p className={`whitespace-pre-line text-xs leading-relaxed text-muted ${abierto ? "" : "line-clamp-3"}`}>{pieza.caption}</p>
          </button>
        )}
        {children}
      </div>
    </article>
  );
}

function Miniatura({ pieza }: { pieza: PiezaOficina }) {
  const src = pieza.previews[0];
  return (
    <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-page-soft">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden className="grid h-full place-items-center text-base">{pieza.video ? "🎬" : "🖼️"}</span>
      )}
    </div>
  );
}

function Previa({ file, numero, quitar }: { file: File; numero?: number; quitar?: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const video = tipoArchivo(file).startsWith("video/");
  return (
    <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-page-soft">
      {url &&
        (video ? (
          <video src={url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={file.name} className="h-full w-full object-cover" />
        ))}
      {numero !== undefined && <span className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">{numero}</span>}
      {quitar && (
        <button onClick={quitar} aria-label={`Quitar ${file.name}`} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-xs text-white">
          ✕
        </button>
      )}
      <span className="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5 text-center text-[9px] text-white">{(file.size / 1048576).toFixed(1)} MB</span>
    </div>
  );
}

function Vacio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 text-center shadow-soft">
      <p className="text-sm font-bold text-ink">{titulo}</p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted">{texto}</p>
    </div>
  );
}

function Esqueleto({ filas = 3 }: { filas?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-2xl bg-white shadow-soft motion-reduce:animate-none" />
      ))}
    </div>
  );
}
