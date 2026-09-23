import Link from "next/link";
import {
  SITE,
  FOOTER_NAV,
  FOOTER_HELP,
  FOOTER_LEGAL,
  whatsappLink,
} from "@/lib/config";
import { Logo } from "./Logo";
import {
  WhatsappIcon,
  InstagramIcon,
  MailIcon,
  MapPinIcon,
} from "./Icons";

export function Footer() {
  return (
    <footer className="border-t border-line bg-primary text-white/80">
      <div className="container-page py-12">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Marca */}
          <div>
            <Logo variant="dark" />
            <p className="mt-4 max-w-xs text-sm text-white/70">{SITE.tagline}</p>
            <div className="mt-5 flex gap-2">
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-accent hover:text-primary"
              >
                <WhatsappIcon className="h-5 w-5" />
              </a>
              <a
                href={SITE.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-accent hover:text-primary"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
              <a
                href={`mailto:${SITE.email}`}
                aria-label="Email"
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-accent hover:text-primary"
              >
                <MailIcon className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Navegación */}
          <div>
            <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-white">
              Navegación
            </h3>
            <ul className="space-y-2.5 text-sm">
              {FOOTER_NAV.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="link-muted text-white/70">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Ayuda */}
          <div>
            <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-white">
              Ayuda
            </h3>
            <ul className="space-y-2.5 text-sm">
              {FOOTER_HELP.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="link-muted text-white/70">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <h3 className="mb-4 font-display text-sm font-bold uppercase tracking-wider text-white">
              Contacto
            </h3>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex items-start gap-2.5">
                <WhatsappIcon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-accent" />
                <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="hover:text-accent">
                  {SITE.phone}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MailIcon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-accent" />
                <a href={`mailto:${SITE.email}`} className="hover:text-accent">
                  {SITE.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPinIcon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-accent" />
                <span>{SITE.address}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra legal */}
        <div className="mt-10 border-t border-white/10 pt-6">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <p className="text-xs text-white/50">
              © 2026 {SITE.name}. Todos los derechos reservados.
            </p>
            <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs">
              {FOOTER_LEGAL.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="link-muted text-white/60">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Defensa del consumidor (placeholder AR) */}
          <div className="mt-6 flex justify-center">
            <span className="text-xs text-white/40">
              Defensa de las y los consumidores. Para reclamos ingresá acá.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
