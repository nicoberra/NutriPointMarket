import { NUTRI, ASSET_PREFIX } from "@/lib/config";
import { WhatsappIcon, InstagramIcon, CheckIcon } from "./Icons";
import { Reveal } from "./motion/Reveal";

/**
 * Sección "Nuestra nutri recomendada": foto, nombre, matrícula, descripción
 * y contacto directo (WhatsApp / Instagram). Los datos salen de NUTRI en
 * lib/config.ts.
 */
export function NutriRecomendada() {
  const wa = `https://wa.me/${NUTRI.whatsapp}?text=${encodeURIComponent(NUTRI.message)}`;
  const photo = NUTRI.photo.startsWith("http") ? NUTRI.photo : `${ASSET_PREFIX}${NUTRI.photo}`;

  return (
    <section className="container-page py-8 sm:py-10" aria-labelledby="nutri-title">
      <Reveal y={20} stagger={0.1}>
        <div className="relative overflow-hidden rounded-3xl bg-primary text-white shadow-card">
          {/* Decoración de fondo (igual lenguaje que los banners) */}
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
            <div className="absolute -bottom-28 right-10 h-80 w-80 rounded-full bg-secondary/30 blur-3xl" />
          </div>

          <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-center lg:gap-10 lg:p-10">
            {/* Foto */}
            <div className="relative mx-auto w-full max-w-[280px] lg:max-w-none">
              <div className="aspect-[4/5] overflow-hidden rounded-2xl ring-4 ring-accent/70">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo}
                  alt={`${NUTRI.name}, ${NUTRI.title}`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-4 py-1.5 font-display text-xs font-black uppercase tracking-wide text-primary shadow-card">
                ★ Nutri recomendada
              </span>
            </div>

            {/* Datos */}
            <div className="text-center lg:text-left">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">
                Trabajamos con
              </p>
              <h2
                id="nutri-title"
                className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl"
              >
                {NUTRI.name}
              </h2>
              <p className="mt-1 text-sm font-semibold text-white/80 sm:text-base">
                {NUTRI.title}
                {NUTRI.license ? ` · ${NUTRI.license}` : ""}
              </p>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base lg:mx-0">
                {NUTRI.bio}
              </p>

              {NUTRI.tags.length > 0 && (
                <ul className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                  {NUTRI.tags.map((t) => (
                    <li
                      key={t}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold"
                    >
                      <CheckIcon className="h-3.5 w-3.5 text-accent" /> {t}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-md w-full bg-[#25D366] font-bold text-white hover:brightness-110 sm:w-auto"
                >
                  <WhatsappIcon className="h-5 w-5" /> Escribile por WhatsApp
                </a>
                {NUTRI.instagram && (
                  <a
                    href={NUTRI.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-md w-full border border-white/25 bg-white/10 font-bold text-white hover:bg-white/20 sm:w-auto"
                  >
                    <InstagramIcon className="h-5 w-5" /> Ver Instagram
                  </a>
                )}
              </div>
              <p className="mt-3 text-xs text-white/60">
                La consulta se coordina directamente con ella. Mencioná que venís de Suple Market.
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
