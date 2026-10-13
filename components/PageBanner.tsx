import Link from "next/link";
import { ChevronRightIcon } from "./Icons";

/** Encabezado de página con breadcrumb, reutilizable. */
export function PageBanner({
  title,
  subtitle,
  crumbs = [],
  titleAs = "h1",
}: {
  title: string;
  subtitle?: string;
  crumbs?: { label: string; href?: string }[];
  /** "p" cuando la página ya tiene su propio H1 (ficha de producto) */
  titleAs?: "h1" | "p";
}) {
  const Title = titleAs;
  return (
    <div className="border-b border-line bg-page-soft">
      <div className="container-page py-8 sm:py-10">
        <nav aria-label="Migas" className="mb-3 flex flex-wrap items-center gap-1 text-xs text-muted">
          <Link href="/" className="hover:text-primary">
            Inicio
          </Link>
          {crumbs.map((c) => (
            <span key={c.label} className="flex items-center gap-1">
              <ChevronRightIcon className="h-3.5 w-3.5" />
              {c.href ? (
                <Link href={c.href} className="hover:text-primary">
                  {c.label}
                </Link>
              ) : (
                <span className="text-ink">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        <Title className="font-display text-2xl font-extrabold tracking-tight text-primary sm:text-3xl">
          {title}
        </Title>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
    </div>
  );
}
