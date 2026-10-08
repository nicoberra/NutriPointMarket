import { NUTRI, ASSET_PREFIX } from "@/lib/config";
import { WhatsappIcon, InstagramIcon, CheckIcon } from "./Icons";
import { Reveal } from "./motion/Reveal";

/**
 * Sección "Nuestra nutri recomendada" (home): ficha blanca con la foto
 * redonda, nombre y matrícula, y los datos en columnas (especialidad, cómo
 * trabaja, contacto con WhatsApp). Los datos salen de NUTRI en lib/config.ts.
 */
export function NutriRecomendada() {
  const wa = `https://wa.me/${NUTRI.whatsapp}?text=${encodeURIComponent(NUTRI.message)}`;
  const photo = NUTRI.photo.startsWith("http") ? NUTRI.photo : `${ASSET_PREFIX}${NUTRI.photo}`;
  return (
    <section id="nutricionista" className="container-page scroll-mt-28 py-8 sm:py-10" aria-labelledby="nutri-title">
      <Reveal y={20} stagger={0.1}>
        <h2 id="nutri-title" className="section-title">Nuestra nutri recomendada</h2>
        <p className="mt-1 max-w-xl text-sm text-muted sm:text-base">
          Si querés que alguien te arme el plan y te diga qué tomar y cuándo, trabajamos con ella.
        </p>

        <div className="relative mt-20 rounded-3xl border border-line bg-white p-6 pt-24 shadow-card sm:mt-14 sm:p-8 sm:pl-56 sm:pt-8">
          {/* Foto redonda que "sale" de la ficha */}
          <div className="absolute -top-12 left-1/2 h-32 w-32 -translate-x-1/2 overflow-hidden rounded-full border-4 border-white shadow-card ring-4 ring-accent sm:-top-6 sm:left-8 sm:h-40 sm:w-40 sm:translate-x-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={`${NUTRI.name}, ${NUTRI.title}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
          </div>

          <div className="text-center sm:text-left">
            <h3 className="font-display text-2xl font-black text-primary sm:text-3xl">{NUTRI.name}</h3>
            <p className="text-sm font-semibold text-muted">
              {NUTRI.title}{NUTRI.license ? ` · ${NUTRI.license}` : ""}
            </p>
          </div>

          <div className="mt-6 grid gap-5 border-t border-line pt-6 sm:grid-cols-3">
            <div>
              <p className="text-xs font-bold text-primary">Especialidad</p>
              <ul className="mt-1.5 space-y-1 text-sm text-ink">
                {NUTRI.tags.map((t) => (
                  <li key={t} className="flex items-start justify-center gap-1.5 sm:justify-start">
                    <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-primary">Cómo trabaja</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink">{NUTRI.bio}</p>
              {NUTRI.training.length > 0 && (
                <>
                  <p className="mt-4 text-xs font-bold text-primary">Formación</p>
                  <ul className="mt-1.5 space-y-1 text-sm text-ink">
                    {NUTRI.training.map((t) => (
                      <li key={t} className="flex items-start justify-center gap-1.5 sm:justify-start">
                        <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="text-xs font-bold text-primary">Contacto</p>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-md mt-1 w-full justify-center bg-[#25D366] font-bold text-white hover:brightness-110 sm:w-52"
              >
                <WhatsappIcon className="h-5 w-5" /> WhatsApp
              </a>
              {NUTRI.instagram && (
                <a
                  href={NUTRI.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-md w-full justify-center bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] font-bold text-white hover:brightness-110 sm:w-52"
                >
                  <InstagramIcon className="h-5 w-5" /> Instagram
                </a>
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
