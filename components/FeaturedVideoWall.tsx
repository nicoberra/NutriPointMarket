"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { Product } from "@/lib/types";
import { BackgroundVideo } from "./BackgroundVideo";
import { ArrowRightIcon } from "./Icons";

/**
 * "Nuestros elegidos del mes": el video de fondo es el protagonista y a la
 * izquierda hay una tira vertical de fotos chicas de los productos que sube
 * sola en loop (como las categorías del inicio). Se puede mover con la rueda
 * del mouse o arrastrando con el dedo; tocar una foto lleva al producto.
 *
 * Loop infinito: los ítems se renderizan dos veces (set 1 + set 2) y cuando
 * el desplazamiento llega a la mitad se reinicia de forma invisible.
 * Con "reducir movimiento" no se mueve sola (solo manual).
 */

const SPEED = 0.35; // px por frame

export function FeaturedVideoWall({
  id,
  products,
  eyebrow,
  title,
  viewAllHref,
  video,
  poster,
}: {
  id?: string;
  products: Product[];
  eyebrow?: string;
  title: string;
  viewAllHref?: string;
  video: { desktop: string; mobile?: string };
  poster?: string;
}) {
  const items = products.filter((p) => p.image);
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const movedRef = useRef(false); // distingue "tocar" de "arrastrar"

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    if (!wrap || !track || items.length === 0) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let auto = !reduce;
    let visible = true;
    let offset = 0;
    let raf = 0;
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;

    const half = () => track.scrollHeight / 2;
    const loop = (v: number) => {
      const h = half();
      if (!h) return v;
      v = v % h;
      return v < 0 ? v + h : v;
    };
    const render = () => {
      track.style.transform = `translate3d(0, ${-offset}px, 0)`;
    };
    const pause = (ms: number) => {
      auto = false;
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        auto = !reduce;
      }, ms);
    };
    const tick = () => {
      if (auto && visible) {
        offset = loop(offset + SPEED);
        render();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // No gastar frames cuando la sección no está en pantalla.
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
      },
      { threshold: 0.05 },
    );
    io.observe(wrap);

    // Rueda del mouse: mueve la tira (y no la página) mientras el cursor está encima.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      offset = loop(offset + e.deltaY);
      render();
      pause(1500);
    };
    wrap.addEventListener("wheel", onWheel, { passive: false });

    // Arrastre con el dedo o el mouse (pointer events + touch-action: none).
    let dragging = false;
    let startY = 0;
    let startOffset = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      movedRef.current = false;
      startY = e.clientY;
      startOffset = offset;
      auto = false;
      try {
        wrap.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dy = e.clientY - startY;
      if (Math.abs(dy) > 6) movedRef.current = true;
      offset = loop(startOffset - dy);
      render();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      pause(1500);
    };
    const onEnter = () => {
      auto = false;
    };
    const onLeave = () => {
      if (!dragging) pause(300);
    };
    wrap.addEventListener("pointerdown", onDown);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerup", onUp);
    wrap.addEventListener("pointercancel", onUp);
    wrap.addEventListener("mouseenter", onEnter);
    wrap.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      if (resumeTimer) clearTimeout(resumeTimer);
      io.disconnect();
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("pointerdown", onDown);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerup", onUp);
      wrap.removeEventListener("pointercancel", onUp);
      wrap.removeEventListener("mouseenter", onEnter);
      wrap.removeEventListener("mouseleave", onLeave);
    };
  }, [items.length]);

  if (items.length === 0) return null;
  const doubled = [...items, ...items];

  return (
    <section id={id} className="scroll-mt-24 py-10 sm:py-14">
      {/* Título */}
      <div className="container-page mb-5 flex items-end justify-between gap-4">
        <div>
          {eyebrow && (
            <p className="mb-1 text-sm font-bold uppercase tracking-wider text-primary">{eyebrow}</p>
          )}
          <h2 className="section-title">{title}</h2>
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="hidden items-center gap-1 text-sm font-semibold text-primary sm:inline-flex"
          >
            Ver todo <ArrowRightIcon className="h-4 w-4" />
          </Link>
        )}
      </div>

      {/* Video protagonista + tira de productos */}
      <div className="relative isolate h-[72vh] min-h-[480px] max-h-[720px] overflow-hidden sm:h-[560px]">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <BackgroundVideo desktop={video.desktop} mobile={video.mobile} poster={poster} />
        </div>

        {/* Tira vertical (izquierda): sube sola, se arrastra y se mueve con la rueda */}
        <div
          ref={wrapRef}
          aria-label="Productos elegidos del mes"
          className="absolute bottom-4 left-3 top-4 w-[84px] cursor-grab select-none overflow-hidden active:cursor-grabbing sm:left-6 sm:w-[104px] lg:left-8"
          style={{
            touchAction: "none",
            maskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
          }}
        >
          <div ref={trackRef} className="flex flex-col gap-3 will-change-transform">
            {doubled.map((p, i) => (
              <Link
                key={`${p.id}-${i}`}
                href={`/producto?slug=${p.slug}`}
                title={p.name}
                aria-label={p.name}
                draggable={false}
                onClickCapture={(e) => {
                  if (movedRef.current) e.preventDefault(); // fue un arrastre, no un toque
                }}
                className="block shrink-0 rounded-2xl bg-white/95 p-1.5 shadow-card transition-transform duration-200 ease-enter hover:scale-105 motion-reduce:transition-none"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt={p.name}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                  className="aspect-square w-full rounded-xl object-cover"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>

      {viewAllHref && (
        <div className="container-page mt-6 text-center sm:hidden">
          <Link href={viewAllHref} className="btn btn-outline btn-md">
            Ver todo <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      )}
    </section>
  );
}
