"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { CheckIcon } from "./Icons";

/**
 * Toast global ("Producto agregado al carrito" y similares) con entrada y
 * salida animadas. El texto se conserva mientras sale para que no "parpadee".
 */
export function ToastHost() {
  const { toast } = useCart();
  const [shown, setShown] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (toast) {
      setShown(toast);
      setLeaving(false);
      return;
    }
    if (!shown) return;
    setLeaving(true);
    const t = setTimeout(() => {
      setShown(null);
      setLeaving(false);
    }, 230);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  if (!shown) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[100] flex justify-center px-4 sm:bottom-8">
      <div
        role="status"
        className={`pointer-events-auto flex items-center gap-2.5 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-drawer ${
          leaving ? "animate-toast-out" : "animate-toast-in"
        }`}
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-primary">
          <CheckIcon className="h-4 w-4" />
        </span>
        {shown}
      </div>
    </div>
  );
}
