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

          {/* Encabezado: nombre a la izquierda, redes a la derecha */}
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
            <div>
              <h3 className="font-display text-2xl font-black text-primary sm:text-3xl">{NUTRI.name}</h3>
              <p className="text-sm font-semibold text-muted">
                {NUTRI.title}{NUTRI.license ? ` · ${NUTRI.license}` : ""}
              </p>
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 font-display text-xs font-black uppercase tracking-wide text-primary">
                ★ Especialista en nutrición deportiva
              </span>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-md w-full justify-center bg-[#25D366] font-bold text-white hover:brightness-110 sm:w-44"
              >
                <WhatsappIcon className="h-5 w-5" /> WhatsApp
              </a>
              {NUTRI.instagram && (
                <a
                  href={NUTRI.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-md w-full justify-center bg-gradient-to-r from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] font-bold text-white hover:brightness-110 sm:w-44"
                >
                  <InstagramIcon className="h-5 w-5" /> Instagram
                </a>
              )}
            </div>
          </div>

          {/* Tres columnas */}
          <div className="mt-6 grid gap-6 border-t border-line pt-6 sm:grid-cols-3">
            <div>
              <p className="text-xs font-bold text-primary">Especialidad</p>
              <ul className="mt-1.5 space-y-1 text-sm text-ink">
                {NUTRI.tags.map((t, i) => (
                  <li
                    key={t}
                    className={
                      i === 0
                        ? "-mx-2 flex items-start justify-center gap-1.5 rounded-lg bg-accent/25 px-2 py-1 font-bold text-primary sm:justify-start"
                        : "flex items-start justify-center gap-1.5 sm:justify-start"
                    }
                  >
                    <CheckIcon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${i === 0 ? "text-primary" : "text-accent"}`} /> <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-primary">Cómo trabaja</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink">{NUTRI.bio}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-primary">Formación</p>
              <ul className="mt-1.5 space-y-1 text-sm text-ink">
                {NUTRI.training.map((t) => (
                  <li key={t} className="flex items-start justify-center gap-1.5 sm:justify-start">
                    <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" /> <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
