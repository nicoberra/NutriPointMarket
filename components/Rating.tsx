import { StarIcon } from "./Icons";

export function Rating({
  value,
  reviews,
  size = "sm",
  showCount = true,
}: {
  value: number;
  reviews?: number;
  size?: "sm" | "md";
  showCount?: boolean;
}) {
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4.5 w-4.5";
  return (
    <div className="flex items-center gap-1.5" aria-label={`Calificación ${value} de 5`}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <StarIcon
            key={i}
            className={`${dim} ${i <= Math.round(value) ? "text-amber-400" : "text-line"}`}
          />
        ))}
      </div>
      {showCount && (
        <span className="text-xs text-muted">
          {value.toFixed(1)}
          {reviews != null && <span className="ml-1">({reviews})</span>}
        </span>
      )}
    </div>
  );
}
