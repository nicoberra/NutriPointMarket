"use client";

import { useCart } from "@/context/CartContext";
import { CheckIcon } from "./Icons";

/** Muestra el toast global "Producto agregado al carrito" y similares. */
export function ToastHost() {
  const { toast } = useCart();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex justify-center px-4 sm:bottom-8">
      {toast && (
        <div
          role="status"
          className="pointer-events-auto flex animate-toast-in items-center gap-2.5 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-drawer"
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-primary">
            <CheckIcon className="h-4 w-4" />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}
