"use client";

import { useCart } from "@/context/CartContext";
import { HeartIcon, HeartFilledIcon } from "./Icons";

export function FavoriteButton({
  id,
  className = "",
}: {
  id: string;
  className?: string;
}) {
  const { isFavorite, toggleFavorite, showToast } = useCart();
  const active = isFavorite(id);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(id);
        showToast(active ? "Quitado de favoritos" : "Agregado a favoritos ❤");
      }}
      aria-label={active ? "Quitar de favoritos" : "Agregar a favoritos"}
      aria-pressed={active}
      className={`grid place-items-center rounded-full bg-white/90 text-ink shadow-soft backdrop-blur transition-all hover:scale-110 hover:text-sale ${
        active ? "text-sale" : ""
      } ${className}`}
    >
      {active ? (
        <HeartFilledIcon className="h-4.5 w-4.5" />
      ) : (
        <HeartIcon className="h-4.5 w-4.5" />
      )}
    </button>
  );
}
