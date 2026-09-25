"use client";

import { useState } from "react";
import { SITE, whatsappLink } from "@/lib/config";
import { PageBanner } from "@/components/PageBanner";
import {
  WhatsappIcon,
  MailIcon,
  InstagramIcon,
  CheckIcon,
  ChevronDownIcon,
  ShieldIcon,
  TruckIcon,
  CardIcon,
} from "@/components/Icons";

const INFO = [
  {
    id: "como-comprar",
    icon: ShieldIcon,
    title: "Cómo comprar",
    text: "Elegí tus productos, agregalos al carrito y finalizá la compra. También podés pedir asesoramiento por WhatsApp antes de comprar.",
  },
  {
    id: "envios",
    icon: TruckIcon,
    title: "Entregas",
    text: "Coordinamos la entrega o el envío por WhatsApp según tu zona. Escribinos y lo arreglamos.",
  },
  {
    id: "pagos",
    icon: CardIcon,
    title: "Medios de pago",
    text: "Aceptamos transferencia bancaria y efectivo. Pagando de esas formas tenés un descuento especial.",
  },
];

const FAQ = [
  { q: "¿Los productos son originales?", a: "Sí. Trabajamos únicamente con distribuidores oficiales de cada marca." },
  { q: "¿Hay descuento por efectivo o transferencia?", a: "Sí, pagando en efectivo o por transferencia bancaria tenés un descuento. Consultanos por WhatsApp." },
  { q: "¿Cómo recibo mi pedido?", a: "Coordinamos la entrega o el envío por WhatsApp según tu zona." },
  { q: "¿Puedo cambiar o devolver un producto?", a: "Sí, dentro de los plazos legales y con el producto cerrado. Escribinos y te ayudamos." },
];

export default function ContactoPage() {
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <>
      <PageBanner
        title="Contacto"
        subtitle="Estamos para ayudarte. Escribinos y te respondemos a la brevedad."
        crumbs={[{ label: "Contacto" }]}
      />

      <div className="container-page py-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          {/* Datos de contacto */}
          <div className="space-y-4">
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-xl border border-line bg-white p-5 transition-colors hover:border-accent"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#25D366]/10 text-[#25D366]">
                <WhatsappIcon className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold text-ink">WhatsApp</p>
                <p className="text-sm text-muted">Escribinos y te asesoramos</p>
              </div>
            </a>
            <a
              href={`mailto:${SITE.email}`}
              className="flex items-center gap-4 rounded-xl border border-line bg-white p-5 transition-colors hover:border-accent"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-soft text-primary">
                <MailIcon className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold text-ink">Email</p>
                <p className="text-sm text-muted">{SITE.email}</p>
              </div>
            </a>
            <a
              href={SITE.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-xl border border-line bg-white p-5 transition-colors hover:border-accent"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-accent-soft text-primary">
                <InstagramIcon className="h-6 w-6" />
              </span>
              <div>
                <p className="font-semibold text-ink">Instagram</p>
                <p className="text-sm text-muted">@suplemarket</p>
              </div>
            </a>
          </div>

          {/* Formulario */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-card">
            <h2 className="font-display text-xl font-bold text-primary">Envianos un mensaje</h2>
            {sent ? (
              <div className="mt-6 flex items-center gap-2 rounded-lg bg-accent-soft px-4 py-3 text-sm font-semibold text-primary">
                <CheckIcon className="h-5 w-5" /> ¡Mensaje enviado! Te responderemos pronto.
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
                className="mt-5 space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <input className="input h-11" placeholder="Nombre" required />
                  <input className="input h-11" type="email" placeholder="Email" required />
                </div>
                <input className="input h-11" placeholder="Asunto" />
                <textarea
                  className="input min-h-32 resize-y py-3"
                  placeholder="Tu mensaje"
                  required
                />
                <button type="submit" className="btn btn-primary btn-lg w-full sm:w-auto">
                  Enviar mensaje
                </button>
                <p className="text-[11px] text-muted">Formulario de demostración.</p>
              </form>
            )}
          </div>
        </div>

        {/* Info: cómo comprar / envíos / pagos */}
        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {INFO.map((item) => (
            <div
              key={item.id}
              id={item.id}
              className="scroll-mt-40 rounded-xl border border-line bg-white p-5"
            >
              <span className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-primary">
                <item.icon className="h-5.5 w-5.5" />
              </span>
              <h3 className="font-display text-base font-bold text-primary">{item.title}</h3>
              <p className="mt-1.5 text-sm text-muted">{item.text}</p>
            </div>
          ))}
        </div>

        {/* Devoluciones (anchor) + FAQ */}
        <div id="devoluciones" className="mt-12 scroll-mt-40" />
        <div id="faq" className="mt-4 scroll-mt-40">
          <h2 className="mb-5 font-display text-xl font-bold text-primary">
            Preguntas frecuentes
          </h2>
          <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
            {FAQ.map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={item.q}>
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-ink">{item.q}</span>
                    <ChevronDownIcon
                      className={`h-5 w-5 shrink-0 text-muted transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {isOpen && <p className="px-5 pb-4 text-sm text-muted">{item.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
