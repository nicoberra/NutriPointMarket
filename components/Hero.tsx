import Link from "next/link";
import { ArrowRightIcon, ShieldIcon, TruckIcon, CardIcon } from "./Icons";

/**
 * Banner principal (hero). Configurable: para reemplazarlo por una imagen
 * diseñada en Canva, cambiá el bloque `visual` por un <Image /> de fondo.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-primary text-white">
      {/* Fondo decorativo */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-secondary/40 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <div className="container-page relative grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-2 lg:py-20">
        {/* Texto */}
        <div className="max-w-xl">
          <span className="badge mb-4 bg-accent/15 text-accent">
            Nueva temporada · Envío a todo el país
          </span>
          <h1 className="font-display text-4xl font-black leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Alcanzá tu <span className="text-accent">mejor versión</span>
          </h1>
          <p className="mt-4 max-w-md text-base text-white/80 sm:text-lg">
            Proteínas, creatinas, vitaminas y suplementos seleccionados para
            acompañar tus objetivos. Productos 100% originales.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/productos" className="btn btn-primary btn-lg">
              Ver productos <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <Link
              href="/ofertas"
              className="btn btn-lg border-2 border-white/30 text-white hover:bg-white/10"
            >
              Ver ofertas
            </Link>
          </div>

          {/* Mini beneficios */}
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/75">
            <li className="flex items-center gap-1.5">
              <ShieldIcon className="h-4 w-4 text-accent" /> 100% originales
            </li>
            <li className="flex items-center gap-1.5">
              <TruckIcon className="h-4 w-4 text-accent" /> Envíos a todo el país
            </li>
            <li className="flex items-center gap-1.5">
              <CardIcon className="h-4 w-4 text-accent" /> Hasta 12 cuotas
            </li>
          </ul>
        </div>

        {/* Visual */}
        <div className="relative hidden lg:block">
          <div className="relative mx-auto aspect-[4/3] w-full max-w-lg">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-white/0 backdrop-blur-sm" />
            <HeroArt />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Ilustración abstracta del hero (placeholder, reemplazable por imagen). */
function HeroArt() {
  return (
    <svg viewBox="0 0 480 360" className="relative h-full w-full" role="img" aria-label="Suplementos deportivos">
      <defs>
        <linearGradient id="hero-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--color-accent))" />
          <stop offset="100%" stopColor="rgb(var(--color-accent) / 0.6)" />
        </linearGradient>
        <linearGradient id="hero-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.55" />
        </linearGradient>
      </defs>

      {/* Tub grande */}
      <g transform="translate(150 60)">
        <rect x="0" y="40" width="120" height="180" rx="20" fill="url(#hero-b)" />
        <rect x="-8" y="12" width="136" height="40" rx="16" fill="url(#hero-a)" />
        <rect x="18" y="0" width="84" height="24" rx="12" fill="rgb(var(--color-accent) / 0.8)" />
        <rect x="20" y="110" width="80" height="60" rx="10" fill="rgb(var(--color-primary) / 0.12)" />
        <text x="60" y="146" textAnchor="middle" fontFamily="var(--font-display)" fontSize="18" fontWeight="900" fill="rgb(var(--color-primary))">
          WHEY
        </text>
      </g>

      {/* Jar chico */}
      <g transform="translate(40 150)">
        <rect x="0" y="30" width="90" height="120" rx="18" fill="url(#hero-b)" />
        <rect x="-6" y="6" width="102" height="34" rx="14" fill="url(#hero-a)" />
      </g>

      {/* Shaker */}
      <g transform="translate(300 130)">
        <rect x="0" y="20" width="80" height="150" rx="16" fill="rgb(var(--color-secondary))" />
        <rect x="0" y="20" width="80" height="150" rx="16" fill="url(#hero-b)" opacity="0.15" />
        <rect x="8" y="0" width="64" height="28" rx="10" fill="url(#hero-a)" />
        <line x1="10" y1="70" x2="70" y2="70" stroke="#fff" strokeOpacity="0.4" />
        <line x1="10" y1="95" x2="70" y2="95" stroke="#fff" strokeOpacity="0.4" />
        <line x1="10" y1="120" x2="70" y2="120" stroke="#fff" strokeOpacity="0.4" />
      </g>
    </svg>
  );
}
