"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/format";
import { whatsappLink } from "@/lib/config";
import { PageBanner } from "@/components/PageBanner";
import { CheckIcon, WhatsappIcon } from "@/components/Icons";

export default function CheckoutPage() {
  const { items, subtotal, count, clear } = useCart();
  const { user } = useAuth();
  const [done, setDone] = useState(false);

  const shipping = subtotal >= 60000 || subtotal === 0 ? 0 : 4500;
  const total = subtotal + shipping;

  const confirm = (e: React.FormEvent) => {
    e.preventDefault();
    setDone(true);
    clear();
  };

  if (done) {
    return (
      <>
        <PageBanner title="Pedido confirmado" crumbs={[{ label: "Checkout" }]} />
        <div className="container-page py-16">
          <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-card">
            <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-accent text-primary">
              <CheckIcon className="h-8 w-8" />
            </span>
            <h2 className="font-display text-xl font-bold text-primary">
              ¡Gracias por tu compra!
            </h2>
            <p className="mt-2 text-sm text-muted">
              Este es un checkout de demostración. En la versión final vas a poder
              pagar online y coordinar el envío. Mientras tanto, escribinos por
              WhatsApp para finalizar tu pedido.
            </p>
            <a
              href={whatsappLink("Hola NutriPointMarket, acabo de hacer un pedido y quería coordinar el pago y envío.")}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-md mt-5 w-full bg-[#25D366] text-white hover:brightness-105"
            >
              <WhatsappIcon className="h-5 w-5" /> Coordinar por WhatsApp
            </a>
            <Link href="/productos" className="btn btn-outline btn-md mt-3 w-full">
              Seguir comprando
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <PageBanner title="Finalizar compra" crumbs={[{ label: "Checkout" }]} />
        <div className="container-page py-16 text-center">
          <p className="font-semibold text-ink">No hay productos en tu carrito.</p>
          <Link href="/productos" className="btn btn-primary btn-md mt-4">
            Ver productos
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageBanner
        title="Finalizar compra"
        subtitle="Checkout de demostración — no se realiza ningún cobro real."
        crumbs={[{ label: "Checkout" }]}
      />
      <div className="container-page py-10">
        <form onSubmit={confirm} className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Datos */}
          <div className="space-y-6">
            <fieldset className="rounded-xl border border-line bg-white p-5">
              <legend className="px-2 font-display text-base font-bold text-primary">
                Datos de contacto
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombre y apellido" defaultValue={user?.name} required />
                <Field label="Email" type="email" defaultValue={user?.email} required />
                <Field label="Teléfono" type="tel" required />
                <Field label="DNI" />
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-line bg-white p-5">
              <legend className="px-2 font-display text-base font-bold text-primary">
                Envío
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Dirección" required />
                </div>
                <Field label="Ciudad" required />
                <Field label="Provincia" required />
                <Field label="Código postal" required />
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-line bg-white p-5">
              <legend className="px-2 font-display text-base font-bold text-primary">
                Medio de pago
              </legend>
              <div className="space-y-2">
                {["Transferencia bancaria", "Efectivo"].map((m, i) => (
                  <label
                    key={m}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-line p-3 text-sm hover:border-accent"
                  >
                    <input
                      type="radio"
                      name="pago"
                      defaultChecked={i === 0}
                      className="h-4 w-4 accent-[rgb(var(--color-accent))]"
                    />
                    {m}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-xs font-semibold text-primary">
                💵 Descuento pagando en efectivo o transferencia.
              </p>
            </fieldset>
          </div>

          {/* Resumen */}
          <aside className="lg:sticky lg:top-40 lg:self-start">
            <div className="rounded-xl border border-line bg-white p-5">
              <h2 className="font-display text-lg font-bold text-primary">Tu pedido</h2>
              <ul className="mt-4 space-y-3">
                {items.map((item) => (
                  <li key={item.key} className="flex justify-between gap-3 text-sm">
                    <span className="min-w-0 text-muted">
                      <span className="font-medium text-ink">{item.quantity}×</span>{" "}
                      {item.product.name}
                    </span>
                    <span className="shrink-0 font-medium text-ink">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-2 border-t border-line pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Subtotal ({count})</dt>
                  <dd className="font-medium text-ink">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Envío</dt>
                  <dd className="font-medium text-ink">
                    {shipping === 0 ? "Gratis" : formatPrice(shipping)}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                <span className="font-semibold text-ink">Total</span>
                <span className="font-display text-2xl font-black text-primary">
                  {formatPrice(total)}
                </span>
              </div>
              <button type="submit" className="btn btn-primary btn-lg mt-5 w-full">
                Confirmar pedido
              </button>
              <p className="mt-2 text-center text-[11px] text-muted">
                Demostración — no se procesa ningún pago real.
              </p>
            </div>
          </aside>
        </form>
      </div>
    </>
  );
}

function Field({
  label,
  type = "text",
  defaultValue,
  required,
}: {
  label: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">
        {label} {required && <span className="text-sale">*</span>}
      </span>
      <input
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="input h-11"
      />
    </label>
  );
}
