import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon, ShieldIcon, TruckIcon, CardIcon } from "./Icons";

/**
 * Banner principal (hero). Fondo crema con el logo de NutriPoint.
 * Configurable: para reemplazarlo por una imagen diseñada en Canva, cambiá el
 * bloque de la derecha por un <Image /> de fondo.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-page">
      {/* Fondo decorativo */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-secondary/30 blur-3xl" />
      </div>

      <div className="container-page relative grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-2 lg:py-20">
        {/* Texto */}
        <div className="max-w-xl">
          <span className="badge mb-4 bg-primary/10 text-primary">
            Nueva temporada · Envío a todo el país
          </span>
          <h1 className="font-display text-4xl font-black leading-[1.05] tracking-tight text-primary sm:text-5xl lg:text-6xl">
            Alcanzá tu <span className="text-secondary">mejor versión</span>
          </h1>
          <p className="mt-4 max-w-md text-base text-muted sm:text-lg">
            Proteínas, creatinas, vitaminas y suplementos seleccionados para
            acompañar tus objetivos. Productos 100% originales.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/productos" className="btn btn-primary btn-lg">
              Ver productos <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <Link href="/ofertas" className="btn btn-secondary btn-lg">
              Ver ofertas
            </Link>
          </div>

          {/* Mini beneficios */}
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-muted">
            <li className="flex items-center gap-1.5">
              <ShieldIcon className="h-4 w-4 text-primary" /> 100% originales
            </li>
            <li className="flex items-center gap-1.5">
              <TruckIcon className="h-4 w-4 text-primary" /> Envíos a todo el país
            </li>
            <li className="flex items-center gap-1.5">
              <CardIcon className="h-4 w-4 text-primary" /> Hasta 12 cuotas
            </li>
          </ul>
        </div>

        {/* Logo */}
        <div className="relative flex justify-center lg:justify-end">
          <Image
            src="/logo.png"
            alt="NutriPoint Market"
            width={560}
            height={498}
            priority
            className="w-full max-w-sm object-contain lg:max-w-md"
          />
        </div>
      </div>
    </section>
  );
}
