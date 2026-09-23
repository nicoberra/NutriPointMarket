"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useCategories } from "@/context/CategoriesContext";
import { ProductVisual } from "./ProductVisual";

/**
 * Carrusel de categorías con auto-scroll infinito (derecha → izquierda).
 *
 * Truco del loop infinito: renderizamos TODOS los ítems dos veces (Set 1 + Set 2).
 * Cuando el scroll llega a la mitad del ancho total se resetea al inicio de forma
 * instantánea; como ambos sets son idénticos, el salto es invisible y parece infinito.
 *
 * - Desktop: usa scrollLeft + flechas (visibles en hover) + drag con el mouse.
 * - Mobile (touch): usa translateX (scrollLeft no anda bien en iOS con RAF) + drag táctil.
 *
 * Ajustes rápidos: SPEED (velocidad px/frame) y CARD_W (ancho de tarjeta, igual al CSS).
 */

const SPEED = 0.6; // px por frame
const CARD_W = 160; // ancho de cada tarjeta (coincide con la clase w-40)

export function CategoryCarousel() {
  const { categories } = useCategories();
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    const btnPrev = prevRef.current;
    const btnNext = nextRef.current;
    if (!wrap || !track) return;

    const isTouch =
      "ontouchstart" in window || navigator.maxTouchPoints > 0;
    let autoPlay = true;
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let raf = 0;

    const halfWidth = () => track.scrollWidth / 2;
    const pauseAndResume = (ms: number) => {
      autoPlay = false;
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        autoPlay = true;
      }, ms);
    };

    // Limpieza registrable
    const cleanups: Array<() => void> = [];

    if (isTouch) {
      // ---- MOBILE: transform ----
      let offset = 0;
      let dragging = false;
      let touchStartX = 0;
      let startOffset = 0;

      const loop = (val: number) => {
        const h = halfWidth();
        if (!h) return val;
        val = val % h;
        return val < 0 ? val + h : val;
      };
      const tick = () => {
        if (autoPlay && !dragging) {
          offset = loop(offset + SPEED);
          track.style.transform = `translateX(-${offset}px)`;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      const onStart = (e: TouchEvent) => {
        dragging = true;
        autoPlay = false;
        touchStartX = e.touches[0].pageX;
        startOffset = offset;
      };
      const onMove = (e: TouchEvent) => {
        offset = loop(startOffset + (touchStartX - e.touches[0].pageX));
        track.style.transform = `translateX(-${offset}px)`;
      };
      const onEnd = () => {
        dragging = false;
        pauseAndResume(1500);
      };
      wrap.addEventListener("touchstart", onStart, { passive: true });
      wrap.addEventListener("touchmove", onMove, { passive: true });
      wrap.addEventListener("touchend", onEnd, { passive: true });
      cleanups.push(() => {
        wrap.removeEventListener("touchstart", onStart);
        wrap.removeEventListener("touchmove", onMove);
        wrap.removeEventListener("touchend", onEnd);
      });
    } else {
      // ---- DESKTOP: scrollLeft ----
      let isDragging = false;
      let dragStartX = 0;
      let dragScrollStart = 0;

      const tick = () => {
        if (autoPlay && !isDragging) {
          wrap.scrollLeft += SPEED;
          if (wrap.scrollLeft >= halfWidth()) wrap.scrollLeft -= halfWidth();
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      const onEnter = () => {
        autoPlay = false;
      };
      const onLeave = () => {
        if (!isDragging) autoPlay = true;
      };
      const onDown = (e: MouseEvent) => {
        isDragging = true;
        autoPlay = false;
        dragStartX = e.pageX;
        dragScrollStart = wrap.scrollLeft;
        wrap.classList.add("is-dragging");
        e.preventDefault();
      };
      const onMove = (e: MouseEvent) => {
        if (!isDragging) return;
        let next = dragScrollStart + (dragStartX - e.pageX);
        const hw = halfWidth();
        if (next < 0) next += hw;
        if (next >= hw) next -= hw;
        wrap.scrollLeft = next;
      };
      const onUp = () => {
        if (!isDragging) return;
        isDragging = false;
        wrap.classList.remove("is-dragging");
        pauseAndResume(1200);
      };
      const onClickCapture = (e: MouseEvent) => {
        if (Math.abs(wrap.scrollLeft - dragScrollStart) > 5) e.preventDefault();
      };
      const onPrev = () => {
        let next = wrap.scrollLeft - CARD_W;
        const hw = halfWidth();
        if (next < 0) next += hw;
        wrap.scrollLeft = next;
        pauseAndResume(1500);
      };
      const onNext = () => {
        let next = wrap.scrollLeft + CARD_W;
        const hw = halfWidth();
        if (next >= hw) next -= hw;
        wrap.scrollLeft = next;
        pauseAndResume(1500);
      };

      wrap.addEventListener("mouseenter", onEnter);
      wrap.addEventListener("mouseleave", onLeave);
      wrap.addEventListener("mousedown", onDown);
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      wrap.addEventListener("click", onClickCapture, true);
      btnPrev?.addEventListener("click", onPrev);
      btnNext?.addEventListener("click", onNext);
      cleanups.push(() => {
        wrap.removeEventListener("mouseenter", onEnter);
        wrap.removeEventListener("mouseleave", onLeave);
        wrap.removeEventListener("mousedown", onDown);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        wrap.removeEventListener("click", onClickCapture, true);
        btnPrev?.removeEventListener("click", onPrev);
        btnNext?.removeEventListener("click", onNext);
      });
    }

    return () => {
      cancelAnimationFrame(raf);
      if (resumeTimer) clearTimeout(resumeTimer);
      cleanups.forEach((fn) => fn());
    };
  }, []);

  // Set 1 + Set 2 idénticos para el loop infinito
  const items = [...categories, ...categories];

  return (
    <section className="py-8 sm:py-10">
      <div className="group/carousel relative">
        {/* Flecha anterior */}
        <button
          ref={prevRef}
          type="button"
          aria-label="Anterior"
          className="absolute left-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white text-lg font-bold text-primary opacity-0 shadow-card transition-opacity hover:bg-page-soft group-hover/carousel:opacity-100 md:grid"
        >
          ‹
        </button>

        <div
          ref={wrapRef}
          className="no-scrollbar cursor-grab overflow-x-scroll overflow-y-hidden select-none [overscroll-behavior-x:contain] active:cursor-grabbing max-md:overflow-hidden"
        >
          <div ref={trackRef} className="flex w-max">
            {items.map((c, i) => (
              <Link
                key={`${c.slug}-${i}`}
                href={`/productos?categoria=${c.slug}`}
                draggable={false}
                className="group/slide flex w-40 shrink-0 flex-col items-center gap-3 px-2 text-center transition-transform duration-200 hover:-translate-y-1"
              >
                <div className="grid h-[130px] w-[130px] place-items-center overflow-hidden rounded-2xl bg-page-soft ring-1 ring-line transition-all group-hover/slide:ring-accent">
                  <ProductVisual
                    shape={c.shape}
                    className="h-28 w-28 transition-transform duration-500 group-hover/slide:scale-110"
                  />
                </div>
                <span className="text-sm font-bold text-ink group-hover/slide:text-primary">
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Flecha siguiente */}
        <button
          ref={nextRef}
          type="button"
          aria-label="Siguiente"
          className="absolute right-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white text-lg font-bold text-primary opacity-0 shadow-card transition-opacity hover:bg-page-soft group-hover/carousel:opacity-100 md:grid"
        >
          ›
        </button>
      </div>
    </section>
  );
}
