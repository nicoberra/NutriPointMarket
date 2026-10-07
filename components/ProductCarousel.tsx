"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap, useGSAP, MOTION_OK, guardEntrance } from "@/lib/gsap";
import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { BackgroundVideo } from "./BackgroundVideo";
import { ChevronLeftIcon, ChevronRightIcon, ArrowRightIcon } from "./Icons";

export function ProductCarousel({
  title,
  eyebrow,
  products,
  viewAllHref,
  bgImage,
  bgVideo,
  id,
}: {
  title: string;
  eyebrow?: string;
  products: Product[];
  viewAllHref?: string;
  /** Imagen de fondo de toda la franja (de borde a borde). */
  bgImage?: string;
  /** Video de fondo (compu / celu); la imagen queda como poster mientras carga. */
  bgVideo?: { desktop: string; mobile?: string };
  /** id para anclas (ej. /#elegidos). */
  id?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Entrada de las tarjetas en stagger (una vez) + parallax suave del fondo.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const root = rootRef.current;
        if (!root) return;
        const cards = scroller.current ? Array.from(scroller.current.children) : [];
        if (cards.length) {
          const tween = gsap.from(cards, {
            autoAlpha: 0,
            y: 24,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.07,
            clearProps: "transform,opacity,visibility",
            scrollTrigger: { trigger: root, start: "top 85%", once: true },
          });
          guardEntrance(tween, 8000);
        }
        const bg = root.querySelector("[data-parallax-bg]");
        if (bg) {
          gsap.fromTo(
            bg,
            { yPercent: -6 },
            {
              yPercent: 6,
              ease: "none",
              scrollTrigger: { trigger: root, start: "top bottom", end: "bottom top", scrub: true },
            },
          );
        }
      });
      return () => mm.revert();
    },
    { scope: rootRef },
  );

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    const amount = Math.min(el.clientWidth * 0.85, 640);
    el.scrollBy({ left: amount * dir, behavior: "smooth" });
  };

  return (
    <div id={id} ref={rootRef} className="relative isolate scroll-mt-24 overflow-hidden">
      {(bgImage || bgVideo) && (
        <div
          data-parallax-bg
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 scale-110 bg-cover bg-no-repeat"
          style={bgImage ? { backgroundImage: `url(${bgImage})`, backgroundPosition: "75% center" } : undefined}
        >
          {bgVideo && (
            <BackgroundVideo desktop={bgVideo.desktop} mobile={bgVideo.mobile} poster={bgImage} />
          )}
        </div>
      )}
    <section className="container-page relative py-10 sm:py-14">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-primary">
              {eyebrow}
            </p>
          )}
          <h2 className="section-title">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="hidden items-center gap-1 text-sm font-semibold text-primary hover:text-primary sm:inline-flex"
            >
              Ver todo <ArrowRightIcon className="h-4 w-4" />
            </Link>
          )}
          <div className="hidden gap-2 sm:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              aria-label="Anterior"
              className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-primary transition-colors hover:bg-primary hover:text-white"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              aria-label="Siguiente"
              className="grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-primary transition-colors hover:bg-primary hover:text-white"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scroller}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
      >
        {products.map((p) => (
          <div
            key={p.id}
            className="w-[calc(50%-8px)] shrink-0 snap-start sm:w-[240px]"
          >
            <ProductCard product={p} />
          </div>
        ))}
      </div>

      {viewAllHref && (
        <div className="mt-6 text-center sm:hidden">
          <Link href={viewAllHref} className="btn btn-outline btn-md">
            Ver todo <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
    </div>
  );
}
