import Link from "next/link";
import type { ReactNode } from "react";
import { ProductSkeleton } from "@/components/ProductSkeleton";

/**
 * Estados de la interfaz (estándar): vacío, error y skeletons de carga.
 * Vacío = ícono + texto + acción. Error = mensaje + Reintentar.
 * Carga = la forma del contenido final (nunca "Cargando…" ni pantalla en blanco).
 */

type Accion = { label: string; href?: string; onClick?: () => void };

function BotonAccion({ accion, primario = true }: { accion: Accion; primario?: boolean }) {
  const cls = `btn ${primario ? "btn-primary" : "btn-outline"} btn-md`;
  return accion.href ? (
    <Link href={accion.href} className={cls}>
      {accion.label}
    </Link>
  ) : (
    <button type="button" onClick={accion.onClick} className={cls}>
      {accion.label}
    </button>
  );
}

export function EmptyState({
  icon,
  title,
  text,
  action,
  secondary,
  compact = false,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  text?: string;
  action?: Accion;
  secondary?: Accion;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`animate-section-in rounded-xl border border-dashed border-line bg-white px-5 text-center motion-reduce:animate-none ${
        compact ? "py-6" : "py-14"
      } ${className}`}
    >
      <span
        aria-hidden
        className={`mx-auto grid place-items-center rounded-2xl bg-page-soft text-primary ${compact ? "mb-2 h-10 w-10" : "mb-3 h-14 w-14"}`}
      >
        {icon}
      </span>
      <p className="font-semibold text-ink">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {(action || secondary) && (
        <div className={`flex flex-wrap justify-center gap-2 ${compact ? "mt-3" : "mt-4"}`}>
          {action && <BotonAccion accion={action} />}
          {secondary && <BotonAccion accion={secondary} primario={false} />}
        </div>
      )}
    </div>
  );
}

export function ErrorState({
  text = "No pudimos cargar esta sección. Revisá tu conexión y probá de nuevo.",
  onRetry,
  className = "",
}: {
  text?: string;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={`animate-section-in rounded-xl border border-sale/30 bg-white px-5 py-10 text-center motion-reduce:animate-none ${className}`}
    >
      <span aria-hidden className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-sale/10 text-xl font-black text-sale">
        !
      </span>
      <p className="font-semibold text-ink">Algo no salió bien</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{text}</p>
      <button type="button" onClick={onRetry} className="btn btn-primary btn-md mt-4">
        Reintentar
      </button>
    </div>
  );
}

/* ------------------------------- Skeletons -------------------------------- */

const pulse = "animate-pulse motion-reduce:animate-none";

/** Grilla del catálogo (misma forma que las tarjetas). */
export function CatalogSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="container-page py-8" aria-busy="true" aria-label="Cargando productos">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Ficha de producto: foto + título, precio y botones. */
export function DetailSkeleton() {
  return (
    <div className="container-page py-8" aria-busy="true" aria-label="Cargando producto">
      <div className={`grid gap-8 lg:grid-cols-2 ${pulse}`}>
        <div className="aspect-square w-full rounded-2xl bg-page-soft" />
        <div className="space-y-4">
          <div className="h-3 w-24 rounded-full bg-page-soft" />
          <div className="h-7 w-4/5 rounded-lg bg-page-soft" />
          <div className="h-24 w-full rounded-xl bg-page-soft" />
          <div className="h-10 w-2/3 rounded-full bg-page-soft" />
          <div className="h-12 w-full rounded-xl bg-page-soft" />
        </div>
      </div>
    </div>
  );
}

/** Tarjeta con formulario (ingreso / registro). */
export function FormSkeleton() {
  return (
    <div className="container-page py-12" aria-busy="true" aria-label="Cargando">
      <div className={`mx-auto max-w-md space-y-4 rounded-2xl border border-line bg-white p-7 ${pulse}`}>
        <div className="mx-auto h-6 w-40 rounded-lg bg-page-soft" />
        <div className="h-11 w-full rounded-xl bg-page-soft" />
        <div className="h-11 w-full rounded-xl bg-page-soft" />
        <div className="h-11 w-full rounded-full bg-page-soft" />
      </div>
    </div>
  );
}

/** Grilla de marcas. */
export function BrandsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${pulse}`} aria-busy="true" aria-label="Cargando marcas">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-[150px] rounded-xl border border-line bg-white" />
      ))}
    </div>
  );
}
