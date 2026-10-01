"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Deslizar hacia abajo (estando arriba de todo) para actualizar la página.
 * Muestra el circulito girando, como en las apps del celular.
 */
export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const pullRef = useRef(0);
  const start = useRef<number | null>(null);
  const refreshing = useRef(false);

  useEffect(() => {
    const THRESHOLD = 70;
    const onStart = (e: TouchEvent) => {
      start.current =
        window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current === null || refreshing.current) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy > 0 && window.scrollY <= 0) {
        const p = Math.min(dy * 0.5, 90);
        pullRef.current = p;
        setPull(p);
      }
    };
    const onEnd = () => {
      if (refreshing.current) return;
      if (pullRef.current >= THRESHOLD) {
        refreshing.current = true;
        setPull(THRESHOLD);
        window.location.reload();
      } else {
        pullRef.current = 0;
        setPull(0);
      }
      start.current = null;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, []);

  if (pull <= 0) return null;
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center"
      style={{ transform: `translateY(${pull - 10}px)` }}
      aria-hidden
    >
      <div className="grid h-9 w-9 place-items-center rounded-full bg-white shadow-card">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-primary"
          style={{ transform: `rotate(${pull * 3}deg)` }}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      </div>
    </div>
  );
}
