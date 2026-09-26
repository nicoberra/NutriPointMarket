import Link from "next/link";
import { ASSET_PREFIX } from "@/lib/config";
import { ArrowRightIcon, ShieldIcon, PercentIcon, CardIcon } from "./Icons";

/**
 * Banner principal (hero). Fondo crema con el logo de NutriPoint.
 * Configurable: para reemplazarlo por una imagen diseñada en Canva, cambiá el
 * bloque de la derecha por un <Image /> de fondo.
 */
export function Hero() {
  return (
    <section className="relative">
      <div className="container-page relative grid items-center gap-8 py-12 sm:py-16 lg:grid-cols-2 lg:py-20">
        {/* Texto */}
        <div className="max-w-xl">
          <span className="badge mb-4 bg-primary/10 text-primary">
            Nueva temporada · Descuentos en efectivo y transferencia
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
              <PercentIcon className="h-4 w-4 text-primary" /> Descuento en efectivo/transferencia
            </li>
            <li className="flex items-center gap-1.5">
              <CardIcon className="h-4 w-4 text-primary" /> Transferencia y efectivo
            </li>
          </ul>
        </div>

        {/* Logo (en celular se muestra arriba de las categorías) */}
        <div className="relative hidden justify-center lg:flex lg:justify-end">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${ASSET_PREFIX}/logo.png`}
            alt="Suple Market"
            className="w-full max-w-md object-contain transition-transform duration-300 ease-out hover:scale-105 lg:max-w-lg"
          />
        </div>
      </div>
    </section>
  );
}
