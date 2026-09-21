"use client";

import { MinusIcon, PlusIcon } from "./Icons";

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  size?: "sm" | "md";
}) {
  const btn =
    size === "sm"
      ? "h-8 w-8"
      : "h-10 w-10";
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));

  return (
    <div className="inline-flex items-center rounded-lg border border-line bg-white">
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        aria-label="Restar"
        className={`${btn} grid place-items-center rounded-l-lg text-ink transition-colors hover:bg-page-soft disabled:opacity-40`}
      >
        <MinusIcon className="h-4 w-4" />
      </button>
      <span className="min-w-8 text-center text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        aria-label="Sumar"
        className={`${btn} grid place-items-center rounded-r-lg text-ink transition-colors hover:bg-page-soft disabled:opacity-40`}
      >
        <PlusIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
