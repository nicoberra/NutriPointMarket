import { NUTRI, ASSET_PREFIX } from "@/lib/config";
import { WhatsappIcon, InstagramIcon, CheckIcon } from "./Icons";
import { Reveal } from "./motion/Reveal";

/**
 * Sección "Nuestra nutri recomendada". Los datos salen de NUTRI (lib/config.ts).
 * `variant` elige el diseño:
 *  - "azul":   tarjeta azul con foto enmarcada (la primera propuesta)
 *  - "sangre": foto a sangre a la izquierda + panel lima con el nombre enorme
 *  - "fondo":  banner ancho con la foto de fondo y el texto encima
 *  - "ficha":  ficha blanca con foto redonda y los datos en columnas
 */
export type NutriVariant = "azul" | "sangre" | "fondo" | "ficha";

function useData() {
  const wa = `https://wa.me/${NUTRI.whatsapp}?text=${encodeURIComponent(NUTRI.message)}`;
  const photo = NUTRI.photo.startsWith("http") ? NUTRI.photo : `${ASSET_PREFIX}${NUTRI.photo}`;
  const waPretty = NUTRI.whatsapp.replace(/^549?(\d{2,4})(\d{4})(\d{4})$/, "+54 9 $1 $2-$3");
  return { wa, photo, waPretty };
}

export function NutriRecomendada({ variant = "azul" }: { variant?: NutriVariant }) {
  if (variant === "sangre") return <Sangre />;
  if (variant === "fondo") return <Fondo />;
  if (variant === "ficha") return <Ficha />;
  return <Azul />;
}

/* ---------------------------------------------------------------- A: azul */
function Azul() {
  const { wa, photo } = useData();
  return (
    <section className="container-page py-8 sm:py-10" aria-labelledby="nutri-title">
      <Reveal y={20} stagger={0.1}>
        <div className="relative overflow-hidden rounded-3xl bg-primary text-white shadow-card">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
            <div className="absolute -bottom-28 right-10 h-80 w-80 rounded-full bg-secondary/30 blur-3xl" />
          </div>
          <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,320px)_1fr] lg:items-center lg:gap-10 lg:p-10">
            <div className="relative mx-auto w-full max-w-[280px] lg:max-w-none">
              <div className="aspect-[4/5] overflow-hidden rounded-2xl ring-4 ring-accent/70">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt={`${NUTRI.name}, ${NUTRI.title}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              </div>
              <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-accent px-4 py-1.5 font-display text-xs font-black uppercase tracking-wide text-primary shadow-card">
                ★ Nutri recomendada
              </span>
            </div>
            <div className="text-center lg:text-left">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Trabajamos con</p>
              <h2 id="nutri-title" className="mt-2 font-display text-3xl font-black leading-tight sm:text-4xl">{NUTRI.name}</h2>
              <p className="mt-1 text-sm font-semibold text-white/80 sm:text-base">
                {NUTRI.title}{NUTRI.license ? ` · ${NUTRI.license}` : ""}
              </p>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base lg:mx-0">{NUTRI.bio}</p>
              {NUTRI.tags.length > 0 && (
                <ul className="mt-5 flex flex-wrap justify-center gap-2 lg:justify-start">
                  {NUTRI.tags.map((t) => (
                    <li key={t} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold">
                      <CheckIcon className="h-3.5 w-3.5 text-accent" /> {t}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-md w-full bg-[#25D366] font-bold text-white hover:brightness-110 sm:w-auto">
                  <WhatsappIcon className="h-5 w-5" /> Escribile por WhatsApp
                </a>
                {NUTRI.instagram && (
                  <a href={NUTRI.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-md w-full border border-white/25 bg-white/10 font-bold text-white hover:bg-white/20 sm:w-auto">
                    <InstagramIcon className="h-5 w-5" /> Ver Instagram
                  </a>
                )}
              </div>
              <p className="mt-3 text-xs text-white/60">La consulta se coordina directamente con ella. Mencioná que venís de Suple Market.</p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------------------------- B: foto a sangre + lima */
function Sangre() {
  const { wa, photo, waPretty } = useData();
  return (
    <section className="container-page py-8 sm:py-10" aria-labelledby="nutri-title">
      <Reveal y={20}>
        <div className="grid overflow-hidden rounded-3xl bg-accent shadow-card lg:grid-cols-[minmax(0,420px)_1fr]">
          {/* Foto a sangre: ocupa todo el alto del panel */}
          <div className="relative aspect-[4/3] sm:aspect-[16/9] lg:aspect-auto lg:min-h-[420px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt={`${NUTRI.name}, ${NUTRI.title}`} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute left-4 top-4 rounded-full bg-primary px-3 py-1 font-display text-[11px] font-black text-white">
              Nuestra nutri
            </div>
          </div>

          {/* Panel lima: nombre enorme, datos en lista */}
          <div className="flex flex-col justify-center p-6 text-primary sm:p-9 lg:p-12">
            <p className="text-sm font-semibold text-primary/70">Para armar tu plan con alguien que sabe</p>
            <h2 id="nutri-title" className="mt-2 font-display text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">
              {NUTRI.name}
            </h2>
            <p className="mt-3 text-base font-semibold">
              {NUTRI.title}{NUTRI.license ? ` · ${NUTRI.license}` : ""}
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-primary/80 sm:text-base">{NUTRI.bio}</p>

            <dl className="mt-6 grid gap-3 border-t border-primary/15 pt-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-bold">Atiende</dt>
                <dd className="text-primary/80">{NUTRI.tags.join(" · ")}</dd>
              </div>
              <div>
                <dt className="font-bold">WhatsApp</dt>
                <dd className="text-primary/80">{waPretty}</dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-md bg-primary font-bold text-white hover:brightness-110">
                <WhatsappIcon className="h-5 w-5" /> Escribile por WhatsApp
              </a>
              {NUTRI.instagram && (
                <a href={NUTRI.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-md border-2 border-primary/30 font-bold text-primary hover:bg-primary/10">
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

/* --------------------------------------------- C: banner con foto de fondo */
function Fondo() {
  const { wa, photo } = useData();
  return (
    <section className="container-page py-8 sm:py-10" aria-labelledby="nutri-title">
      <Reveal y={20}>
        <div className="relative isolate min-h-[460px] overflow-hidden rounded-3xl bg-primary text-white shadow-card sm:min-h-[420px]">
          {/* Foto de fondo, anclada a la derecha; degradé azul hacia la izquierda */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="absolute inset-y-0 right-0 z-0 h-full w-full object-cover object-[70%_20%] sm:w-[62%] sm:object-center"
          />
          <div className="absolute inset-0 z-0 bg-gradient-to-t from-primary via-primary/85 to-primary/20 sm:bg-gradient-to-r sm:from-primary sm:via-primary/95 sm:to-primary/0" aria-hidden />

          <div className="relative z-10 flex h-full min-h-[460px] flex-col justify-end p-6 sm:min-h-[420px] sm:max-w-[58%] sm:justify-center sm:p-10 lg:p-12">
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-accent px-3 py-1 font-display text-[11px] font-black text-primary">
              Nutri recomendada
            </span>
            <h2 id="nutri-title" className="mt-4 font-display text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
              Consultá con {NUTRI.name.split(" ")[0]}
            </h2>
            <p className="mt-2 text-base font-semibold text-accent">
              {NUTRI.name} · {NUTRI.title}{NUTRI.license ? ` · ${NUTRI.license}` : ""}
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85 sm:text-base">{NUTRI.bio}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-md bg-[#25D366] font-bold text-white hover:brightness-110">
                <WhatsappIcon className="h-5 w-5" /> Escribile por WhatsApp
              </a>
              <span className="text-xs text-white/70">Respondé "vengo de Suple Market" y te orienta.</span>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ----------------------------------------- D: ficha blanca con foto redonda */
function Ficha() {
  const { wa, photo, waPretty } = useData();
  return (
    <section className="container-page py-8 sm:py-10" aria-labelledby="nutri-title">
      <Reveal y={20} stagger={0.1}>
        <h2 id="nutri-title" className="section-title">Nuestra nutri recomendada</h2>
        <p className="mt-1 max-w-xl text-sm text-muted sm:text-base">
          Si querés que alguien te arme el plan y te diga qué tomar y cuándo, trabajamos con ella.
        </p>

        <div className="relative mt-8 rounded-3xl border border-line bg-white p-6 pt-20 shadow-card sm:mt-14 sm:p-8 sm:pl-56 sm:pt-8">
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
                  <li key={t} className="flex items-center justify-center gap-1.5 sm:justify-start">
                    <CheckIcon className="h-3.5 w-3.5 text-accent" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold text-primary">Cómo trabaja</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink">{NUTRI.bio}</p>
            </div>
            <div className="flex flex-col items-center gap-2 sm:items-start">
              <p className="text-xs font-bold text-primary">Contacto</p>
              <p className="text-sm text-ink">{waPretty}</p>
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-md mt-1 w-full bg-[#25D366] font-bold text-white hover:brightness-110 sm:w-auto">
                <WhatsappIcon className="h-5 w-5" /> WhatsApp
              </a>
              {NUTRI.instagram && (
                <a href={NUTRI.instagram} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-primary hover:underline">
                  Ver Instagram
                </a>
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
