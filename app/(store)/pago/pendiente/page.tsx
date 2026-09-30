"use client";

import Link from "next/link";
import { whatsappLink } from "@/lib/config";
import { PageBanner } from "@/components/PageBanner";
import { WhatsappIcon } from "@/components/Icons";

/** Página de retorno de Mercado Pago cuando el pago quedó pendiente. */
export default function PagoPendientePage() {
  return (
    <>
      <PageBanner title="Pago pendiente" crumbs={[{ label: "Pago" }]} />
      <div className="container-page py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-card">
          <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary text-3xl">
            ⏳
          </span>
          <h2 className="font-display text-xl font-bold text-primary">Tu pago está pendiente</h2>
          <p className="mt-2 text-sm text-muted">
            Mercado Pago todavía está procesando el pago (por ejemplo, pagos en efectivo o
            que tardan en acreditar). Cuando se confirme, preparamos tu pedido. Si tenés
            dudas, escribinos.
          </p>
          <a
            href={whatsappLink("Hola Suple Market, mi pago por Mercado Pago quedó pendiente y quería consultar.")}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-md mt-5 w-full bg-[#25D366] text-white hover:brightness-105"
          >
            <WhatsappIcon className="h-5 w-5" /> Consultar por WhatsApp
          </a>
          <Link href="/productos" className="btn btn-outline btn-md mt-3 w-full">
            Seguir comprando
          </Link>
        </div>
      </div>
    </>
  );
}
