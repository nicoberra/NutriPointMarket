"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/format";
import { whatsappLink, TRANSFER } from "@/lib/config";
import { createOrder, mpCreatePreference } from "@/lib/api";
import { PageBanner } from "@/components/PageBanner";
import { CheckIcon, WhatsappIcon } from "@/components/Icons";

type Metodo = "Transferencia" | "Mercado Pago";

// Descuento por pagar en efectivo o transferencia (sobre los productos).
const DESCUENTO_EF_TR = 0.1;

interface DoneInfo {
  metodo: Metodo;
  id: string;
  total: number;
}

export default function CheckoutPage() {
  const { items, subtotal, count, clear } = useCart();
  const { user } = useAuth();
  const [done, setDone] = useState<DoneInfo | null>(null);
  const [method, setMethod] = useState<Metodo>("Transferencia");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shipping = subtotal >= 120000 || subtotal === 0 ? 0 : 4500;
  const total = subtotal + shipping;

  // Descuento por pagar en efectivo o transferencia (no aplica a Mercado Pago).
  // El 15% se calcula sobre CADA producto y se suma (redondeo por producto),
  // nunca sobre el envío.
  const descuentoProductos = items.reduce(
    (acc, i) => acc + Math.round(i.product.price * i.quantity * DESCUENTO_EF_TR),
    0,
  );
  const pagaConDescuento = method === "Transferencia";
  const descuento = pagaConDescuento ? descuentoProductos : 0;
  const totalFinal = total - descuento;

  const confirm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const fd = new FormData(e.currentTarget);
    const metodo = (String(fd.get("pago") || "Transferencia") as Metodo);
    const cliente = String(fd.get("nombre") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const telefono = String(fd.get("telefono") || "").trim();
    const direccion = [fd.get("direccion"), fd.get("ciudad"), fd.get("provincia"), fd.get("cp")]
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .join(", ");
    const detalle = items
      .map((i) => `${i.quantity}x ${i.product.name}${i.flavor ? ` (${i.flavor})` : ""}`)
      .join(" | ");
    const itemsJson = JSON.stringify(
      items.map((i) => ({ n: i.product.name, v: i.flavor ?? "", q: i.quantity })),
    );
    const id = "ped" + Date.now();

    // Total según el método: efectivo/transferencia con 15% off (por producto);
    // Mercado Pago sin descuento.
    const desc = metodo === "Mercado Pago" ? 0 : descuentoProductos;
    const montoFinal = total - desc;

    setLoading(true);
    try {
      await createOrder({
        id,
        cliente,
        telefono,
        email,
        detalle,
        monto: montoFinal,
        montoEnvio: shipping,
        envio: direccion,
        metodo,
        items: itemsJson,
      });

      if (metodo === "Mercado Pago") {
        const link = await mpCreatePreference({
          pedido: id,
          monto: montoFinal,
          titulo: `Pedido Suple Market (${count} art.)`,
          email,
        });
        if (!link) {
          setError("No se pudo iniciar el pago con Mercado Pago. Probá de nuevo o elegí otro medio.");
          setLoading(false);
          return;
        }
        window.location.href = link; // redirige a Mercado Pago
        return;
      }

      // Efectivo / Transferencia
      clear();
      setDone({ metodo, id, total: montoFinal });
    } catch {
      setError("No se pudo confirmar el pedido. Revisá tu conexión e intentá de nuevo.");
      setLoading(false);
    }
  };

  /* ----------------------------- Confirmado ------------------------------ */
  if (done) {
    const waMsg = `Hola Suple Market, hice el pedido ${done.id} por ${formatPrice(done.total)} con transferencia. Te paso el comprobante.`;
    return (
      <>
        <PageBanner title="Pedido confirmado" crumbs={[{ label: "Checkout" }]} />
        <div className="container-page py-16">
          <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-8 text-center shadow-card">
            <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-accent text-primary">
              <CheckIcon className="h-8 w-8" />
            </span>
            <h2 className="font-display text-xl font-bold text-primary">¡Gracias por tu compra!</h2>
            <p className="mt-1 text-sm text-muted">
              Pedido <span className="font-semibold text-ink">{done.id}</span> ·{" "}
              {formatPrice(done.total)}
            </p>

            <div className="mt-5 rounded-xl border border-line bg-page-soft p-4 text-left text-sm">
              <p className="font-semibold text-primary">Datos para transferir</p>
              <dl className="mt-2 space-y-1">
                <Row k="Alias" v={TRANSFER.alias} />
                {TRANSFER.cvu && <Row k="CVU" v={TRANSFER.cvu} />}
                {TRANSFER.titular && <Row k="Titular" v={TRANSFER.titular} />}
                {TRANSFER.banco && <Row k="Banco" v={TRANSFER.banco} />}
                <Row k="Importe" v={formatPrice(done.total)} />
              </dl>
              <p className="mt-3 text-xs text-muted">
                Hacé la transferencia y enviá el <b>comprobante</b> por WhatsApp para
                confirmar tu pedido. 👇
              </p>
            </div>
            <a
              href={whatsappLink(waMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-md mt-4 w-full bg-[#25D366] text-white hover:brightness-105"
            >
              <WhatsappIcon className="h-5 w-5" /> Enviar comprobante por WhatsApp
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

  const metodos: { v: Metodo; label: string; hint?: string }[] = [
    { v: "Transferencia", label: "Transferencia bancaria", hint: "10% de descuento. Enviás el comprobante por WhatsApp." },
    { v: "Mercado Pago", label: "Mercado Pago", hint: "Dinero en cuenta, débito o crédito. Te lleva a Mercado Pago." },
  ];

  return (
    <>
      <PageBanner title="Finalizar compra" crumbs={[{ label: "Checkout" }]} />
      <div className="container-page py-10">
        <form onSubmit={confirm} className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Datos */}
          <div className="space-y-6">
            <fieldset className="rounded-xl border border-line bg-white p-5">
              <legend className="px-2 font-display text-base font-bold text-primary">
                Medio de pago
              </legend>
              <div className="space-y-2">
                {metodos.map((m, i) => (
                  <label
                    key={m.v}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm hover:border-accent ${
                      method === m.v ? "border-accent bg-accent/5" : "border-line"
                    }`}
                  >
                    <input
                      type="radio"
                      name="pago"
                      value={m.v}
                      defaultChecked={i === 0}
                      onChange={() => setMethod(m.v)}
                      className="mt-0.5 h-4 w-4 accent-[rgb(var(--color-accent))]"
                    />
                    <span>
                      <span className="font-semibold text-ink">{m.label}</span>
                      {m.hint && <span className="block text-xs text-muted">{m.hint}</span>}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-line bg-white p-5">
              <legend className="px-2 font-display text-base font-bold text-primary">
                Datos de contacto
              </legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="nombre" label="Nombre y apellido" defaultValue={user?.name} required />
                <Field name="email" label="Email" type="email" defaultValue={user?.email} required />
                <Field name="telefono" label="WhatsApp" type="tel" required />
                <Field name="dni" label="DNI" />
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-line bg-white p-5">
              <legend className="px-2 font-display text-base font-bold text-primary">Envío</legend>
              <p className="mb-2 text-xs text-muted">
                {formatPrice(4500)} · gratis en compras desde {formatPrice(120000)}.
              </p>
              <p className="mb-3 rounded-lg bg-page-soft px-3 py-2 text-xs text-muted">
                🛵 Los envíos se hacen por <b>motomensajería / logística propia</b>, así que
                no hay código de seguimiento (tipo Andreani o Correo). Coordinamos la
                entrega con vos por WhatsApp.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field name="direccion" label="Dirección" required />
                </div>
                <Field name="ciudad" label="Ciudad" required />
                <Field name="provincia" label="Provincia" required />
                <Field name="cp" label="Código postal" required />
              </div>
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
                {descuento > 0 && (
                  <div className="flex justify-between text-secondary">
                    <dt className="font-semibold">Descuento {method.toLowerCase()} (10%)</dt>
                    <dd className="font-semibold">− {formatPrice(descuento)}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-4">
                <span className="font-semibold text-ink">Total</span>
                <span className="flex items-baseline gap-2">
                  {descuento > 0 && (
                    <span className="text-base font-semibold text-muted line-through">
                      {formatPrice(total)}
                    </span>
                  )}
                  <span className="font-display text-2xl font-black text-primary">
                    {formatPrice(totalFinal)}
                  </span>
                </span>
              </div>
              {descuento > 0 && (
                <p className="mt-1 text-right text-xs font-semibold text-secondary">
                  Precio con 10% off pagando con {method.toLowerCase()} · ahorrás{" "}
                  {formatPrice(descuento)}
                </p>
              )}

              {error && (
                <p className="mt-4 rounded-lg bg-sale/10 px-3 py-2 text-center text-sm text-sale">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg mt-5 w-full disabled:opacity-60"
              >
                {loading
                  ? "Procesando…"
                  : method === "Mercado Pago"
                    ? "Pago seguro"
                    : "Confirmar pedido"}
              </button>
            </div>
          </aside>
        </form>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="font-semibold text-ink">{v}</dd>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  defaultValue,
  required,
}: {
  name: string;
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
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="input h-11"
      />
    </label>
  );
}
