import Link from "next/link";
import { ArrowRightIcon, ShieldIcon, PercentIcon, CardIcon } from "./Icons";
import { HeroShowcase } from "./HeroShowcase";
import { HeroIntro } from "./HeroIntro";

/**
 * Banner principal (hero). Fondo crema con el logo de NutriPoint.
 * Configurable: para reemplazarlo por una imagen diseñada en Canva, cambiá el
 * bloque de la derecha por un <Image /> de fondo.
 */
export function Hero() {
  return (
    <section data-hero className="relative">
      <HeroIntro />
      <div className="container-page relative grid items-start gap-8 pb-10 pt-2 sm:pb-12 lg:grid-cols-2 lg:pb-14">
        {/* Texto */}
        <div className="max-w-xl">
          <span data-hero-badge className="badge mb-4 bg-primary/10 text-primary">
            10% de descuento por transferencia
          </span>
          <h1
            data-hero-title
            className="font-display text-4xl font-black leading-[1.05] tracking-tight text-primary sm:text-5xl lg:text-6xl"
          >
            Potenciá tu <span className="inline-block text-secondary">rendimiento</span>
          </h1>
          <p data-hero-text className="mt-4 max-w-md text-base text-muted sm:text-lg">
            Proteínas, creatinas, pancakes proteicos y suplementos seleccionados para
            acompañar tus objetivos. Productos 100% originales.
          </p>
          <div data-hero-cta className="mt-7 flex flex-wrap gap-3">
            <Link href="/productos" className="btn btn-primary btn-lg">
              Ver productos <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <Link href="/#elegidos" className="btn btn-secondary btn-lg">
              Ver elegidos del mes
            </Link>
          </div>

          {/* Mini beneficios */}
          <ul
            data-hero-benefits
            className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-muted"
          >
            <li className="flex items-center gap-1.5">
              <ShieldIcon className="h-4 w-4 text-primary" /> 100% originales
            </li>
            <li className="flex items-center gap-1.5">
              <PercentIcon className="h-4 w-4 text-primary" /> 10% de descuento por transferencia
            </li>
            <li className="flex items-center gap-1.5">
              <CardIcon className="h-4 w-4 text-primary" /> Pago seguro
            </li>
          </ul>
        </div>

        {/* Logo + destacados (en celular el logo se muestra arriba de las categorías) */}
        <div className="relative hidden lg:block">
          <HeroShowcase />
        </div>
      </div>
    </section>
  );
}
