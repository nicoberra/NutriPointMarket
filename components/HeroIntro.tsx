"use client";

import { gsap, useGSAP, SplitText, MOTION_OK } from "@/lib/gsap";

/**
 * Coreografía de entrada del hero (≈1,1 s): badge → título palabra por palabra
 * (con "rendimiento" resaltado) → texto → botones → beneficios; el logo con la
 * mascota y los destacados entran en paralelo y después flotan suavemente.
 * Los blobs del hero tienen un parallax leve al scrollear.
 * Con "reducir movimiento" no se anima nada (todo visible de entrada).
 */
export function HeroIntro() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const hero = document.querySelector<HTMLElement>("[data-hero]");
      if (!hero) return;
      const q = gsap.utils.selector(hero);
      const title = q("[data-hero-title]")[0];

      const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.6 } });
      tl.from(q("[data-hero-badge]"), { autoAlpha: 0, y: 12, duration: 0.4 });

      if (title) {
        const split = SplitText.create(title, { type: "words", wordsClass: "hero-word" });
        tl.from(
          split.words,
          { autoAlpha: 0, yPercent: 60, stagger: 0.07, duration: 0.7 },
          "-=0.15",
        );
        const highlight = title.querySelector("span");
        if (highlight) {
          tl.fromTo(
            highlight,
            { scale: 0.9 },
            { scale: 1, duration: 0.5, ease: "back.out(2.5)", transformOrigin: "left center" },
            "-=0.3",
          );
        }
      }

      tl.from(q("[data-hero-text]"), { autoAlpha: 0, y: 14 }, "-=0.35")
        .from(q("[data-hero-cta] > *"), { autoAlpha: 0, y: 14, stagger: 0.08 }, "-=0.4")
        .from(q("[data-hero-benefits] > *"), { autoAlpha: 0, y: 8, stagger: 0.06, duration: 0.4 }, "-=0.35")
        .from(q("[data-hero-logo]"), { autoAlpha: 0, scale: 0.94, duration: 0.8 }, 0.15)
        .from(q("[data-hero-pick]"), { autoAlpha: 0, y: 16, scale: 0.96, stagger: 0.12 }, "-=0.5");

      // Flotación suave (loop) cuando termina la entrada.
      gsap.to(q("[data-hero-logo]"), {
        y: -8,
        duration: 3.2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 1.3,
      });
      gsap.to(q("[data-hero-pick]"), {
        y: -5,
        duration: 2.6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        stagger: 0.4,
        delay: 1.5,
      });

      // Parallax leve de los blobs (scrub = la rueda es el reloj: sin ease).
      gsap.to(q("[data-hero-blob]"), {
        yPercent: 25,
        ease: "none",
        scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
      });
    });
    return () => mm.revert();
  });

  return null;
}
