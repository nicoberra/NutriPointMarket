"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Número que "cuenta" hasta el valor nuevo (≈600 ms, ease-out). Con "reducir
 * movimiento" devuelve el valor directo. Pensado para los KPI del CRM.
 */
export function useCountUp(value: number, ms = 600): number {
  const [shown, setShown] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const from = fromRef.current;
    const to = value;
    if (reduce || from === to || !Number.isFinite(to)) {
      fromRef.current = to;
      setShown(to);
      return;
    }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cúbico
      const cur = from + (to - from) * eased;
      setShown(Number.isInteger(to) && Number.isInteger(from) ? Math.round(cur) : cur);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, ms]);

  return shown;
}
