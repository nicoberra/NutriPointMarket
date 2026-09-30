"use client";

import Link from "next/link";
import { whatsappLink } from "@/lib/config";
import { PageBanner } from "@/components/PageBanner";
import { WhatsappIcon } from "@/components/Icons";

/** Página de retorno de Mercado Pago cuando el pago fue rechazado o cancelado. */
export default function PagoErrorPage() {
  return (
    <>
      <PageBanner title="Pago no completado" crumbs={[{ label: "Pago" }]} />
      <div className="container-page py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-card">
          <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-sale/10 text-sale text-3xl">
            ✕
          </span>
          <h2 className="font-display text-xl font-bold text-primary">No se completó el pago</h2>
          <p className="mt-2 text-sm text-muted">
            El pago no se pudo procesar o fue cancelado. No te preocupes: no se te cobró
            nada. Podés intentar de nuevo o pagar por transferencia/efectivo.
          </p>
          <Link href="/checkout" className="btn btn-primary btn-md mt-5 w-full">
            Volver a intentar
          </Link>
          <a
            href={whatsappLink("Hola Suple Market, tuve un problema al pagar por Mercado Pago y quería ayuda.")}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-md mt-3 w-full bg-[#25D366] text-white hover:brightness-105"
          >
            <WhatsappIcon className="h-5 w-5" /> Pedir ayuda por WhatsApp
          </a>
        </div>
      </div>
    </>
  );
}
