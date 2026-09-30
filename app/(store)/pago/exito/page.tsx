"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { whatsappLink } from "@/lib/config";
import { PageBanner } from "@/components/PageBanner";
import { CheckIcon, WhatsappIcon } from "@/components/Icons";

/** Página de retorno de Mercado Pago cuando el pago fue aprobado. */
export default function PagoExitoPage() {
  const { clear } = useCart();
  const [ref, setRef] = useState("");

  useEffect(() => {
    clear(); // el pago se aprobó → vaciamos el carrito
    try {
      const p = new URLSearchParams(window.location.search);
      setRef(p.get("external_reference") || "");
    } catch {
      /* ignore */
    }
  }, [clear]);

  return (
    <>
      <PageBanner title="Pago aprobado" crumbs={[{ label: "Pago" }]} />
      <div className="container-page py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-card">
          <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-accent text-primary">
            <CheckIcon className="h-8 w-8" />
          </span>
          <h2 className="font-display text-xl font-bold text-primary">¡Pago aprobado! 🎉</h2>
          <p className="mt-2 text-sm text-muted">
            Recibimos tu pago{ref ? ` del pedido ${ref}` : ""}. Ya estamos preparando tu
            pedido. Te vamos a contactar para coordinar el envío.
          </p>
          <a
            href={whatsappLink(
              `Hola Suple Market, pagué por Mercado Pago${ref ? ` (pedido ${ref})` : ""} y quería coordinar el envío.`,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-md mt-5 w-full bg-[#25D366] text-white hover:brightness-105"
          >
            <WhatsappIcon className="h-5 w-5" /> Coordinar el envío por WhatsApp
          </a>
          <Link href="/productos" className="btn btn-outline btn-md mt-3 w-full">
            Seguir comprando
          </Link>
        </div>
      </div>
    </>
  );
}
