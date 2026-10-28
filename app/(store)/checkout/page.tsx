"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice } from "@/lib/format";
import { whatsappLink, TRANSFER, transferPrice } from "@/lib/config";
import { createOrder, mpCreatePreference, uploadComprobante } from "@/lib/api";
import { PageBanner } from "@/components/PageBanner";
import { CheckIcon, WhatsappIcon } from "@/components/Icons";
import { PROVINCIAS, ZONAS_ENVIO, ENVIO_GRATIS_DESDE, calcularEnvio, detectarZona, type ZonaDetectada } from "@/lib/envios";
import { Trampa, CAMPO_TRAMPA } from "@/components/Trampa";

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
  const [compUp, setCompUp] = useState<"idle" | "up" | "done">("idle");
  // Número de pedido del intento de compra actual: si el cliente reintenta la
  // MISMA compra (p. ej. tras un corte de conexión) se reutiliza y el servidor
  // no la duplica. Si cambia algo del pedido, se genera uno nuevo.
  const intento = useRef<{ firma: string; id: string } | null>(null);

  // Envío a domicilio: la zona se detecta sola a partir de la localidad o
  // barrio (API Georef). Si no se reconoce, el cliente elige provincia/partido.
  const [provincia, setProvincia] = useState("");
  const [partido, setPartido] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [detectada, setDetectada] = useState<ZonaDetectada | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [manual, setManual] = useState(false);
  const envioInfo = calcularEnvio({ provincia, partido });

  useEffect(() => {
    if (manual) return;
    const texto = localidad.trim();
    if (texto.length < 3) {
      setDetectada(null);
      setProvincia("");
      setPartido("");
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const z = await detectarZona(texto, ctrl.signal);
        if (ctrl.signal.aborted) return;
        setDetectada(z);
        setProvincia(z ? z.provincia : "");
        setPartido(z ? z.partido : "");
      } catch {
        if (!ctrl.signal.aborted) { setDetectada(null); setProvincia(""); setPartido(""); }
      } finally {
        if (!ctrl.signal.aborted) setBuscando(false);
      }
    }, 650);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [localidad, manual]);

  // Mostrar los selectores cuando no se reconoce la localidad, cuando hay que
  // elegir entre La Matanza Norte/Sur o cuando el cliente quiere corregir.
  const noReconocida = !buscando && localidad.trim().length >= 3 && !detectada;
  const faltaPartido = !!detectada && detectada.provincia === "Buenos Aires" && !detectada.partido;
  const verSelectores = manual || noReconocida || faltaPartido;
  // Envío gratis en CABA y GBA desde ENVIO_GRATIS_DESDE (subtotal a precio publicado).
  const envioGratis = envioInfo.tipo === "zona" && subtotal >= ENVIO_GRATIS_DESDE;
  const shipping = subtotal === 0 || envioGratis ? 0 : envioInfo.costo;
  const total = subtotal + shipping;

  // Descuento por pagar con transferencia (no aplica a Mercado Pago): cada
  // producto vuelve a su precio base (el del CRM). Nunca sobre el envío.
  const descuentoProductos = items.reduce(
    (acc, i) =>
      acc +
      Math.round(
        (i.product.price - (i.product.basePrice ?? transferPrice(i.product.price))) * i.quantity,
      ),
    0,
  );
  void DESCUENTO_EF_TR;
  const pagaConDescuento = method === "Transferencia";
  const descuento = pagaConDescuento ? descuentoProductos : 0;
  const totalFinal = total - descuento;

  const confirm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const fd = new FormData(e.currentTarget);
    if (envioInfo.tipo === "pendiente") {
      setError(
        provincia === "Buenos Aires"
          ? "Elegí tu partido para calcular el envío."
          : verSelectores
            ? "Elegí tu provincia para calcular el envío."
            : "Escribí tu localidad o barrio para calcular el envío.",
      );
      return;
    }
    const metodo = (String(fd.get("pago") || "Transferencia") as Metodo);
    const cliente = String(fd.get("nombre") || "").trim();
    // Recordamos el nombre en este dispositivo para saludarlo la próxima vez.
    try {
      if (cliente) localStorage.setItem("sm-cliente-nombre", cliente);
    } catch {
      /* ignore */
    }
    const email = String(fd.get("email") || "").trim();
    const telefono = String(fd.get("telefono") || "").trim();
    const direccion = [fd.get("direccion"), fd.get("ciudad"), partido, provincia, fd.get("cp")]
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .join(", ");
    // Texto del envío para el pedido: "Envío GBA 1 · Morón", "Envío Vía Cargo · a coordinar"
    const envioTexto = [direccion, envioInfo.resumen, envioGratis ? "Envío gratis (compra desde $120.000)" : ""].filter(Boolean).join(" · ");
    // Combos: las variantes elegidas van en el detalle (legible) y en items
    // (cv) para que al aprobar el pago se descuente la variante correcta.
    const choicesTxt = (i: (typeof items)[number]) =>
      i.comboChoices
        ? ` [${Object.entries(i.comboChoices)
            .map(([n, v]) => `${n}: ${v}`)
            .join(", ")}]`
        : "";
    const detalle = items
      .map(
        (i) =>
          `${i.quantity}x ${i.product.name}${i.box && i.presentation ? ` [${i.presentation}]` : ""}${i.flavor ? ` (${i.flavor})` : ""}${choicesTxt(i)}`,
      )
      .join(" | ");
    const itemsJson = JSON.stringify(
      items.map((i) => ({
        n: i.product.name,
        v: i.flavor ?? "",
        q: i.quantity,
        ...(i.comboChoices ? { cv: i.comboChoices } : {}),
        ...(i.box ? { caja: true } : {}),
      })),
    );
    // Total según el método: efectivo/transferencia con 10% off (por producto);
    // Mercado Pago sin descuento.
    const desc = metodo === "Mercado Pago" ? 0 : descuentoProductos;
    const montoFinal = total - desc;

    const firma = JSON.stringify([itemsJson, cliente, telefono, email, metodo, envioTexto, montoFinal]);
    if (!intento.current || intento.current.firma !== firma) {
      intento.current = { firma, id: "ped" + Date.now() };
    }
    const id = intento.current.id;

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
        envio: envioTexto,
        metodo,
        items: itemsJson,
        hp: String(fd.get(CAMPO_TRAMPA) || ""),
      });

      if (metodo === "Mercado Pago") {
        const link = await mpCreatePreference({
          pedido: id,
          monto: montoFinal,
          titulo: `Pedido Suple Market (${count} art.)`,
          email,
          // El envío va como ítem aparte en Mercado Pago
          envio: shipping,
          envioTitulo: envioInfo.tipo === "zona" ? `Envío a domicilio · ${envioInfo.zona.corto}` : "Envío a domicilio",
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
      intento.current = null; // compra cerrada: la próxima usa otro número
      clear();
      setDone({ metodo, id, total: montoFinal });
    } catch (e) {
      // El backend puede rechazar el pedido (p. ej. precios desactualizados) con un motivo claro.
      const msg = e instanceof Error && e.message && !/timeout|fetch/i.test(e.message) ? e.message : "";
      setError(msg || "No se pudo confirmar el pedido. Revisá tu conexión e intentá de nuevo.");
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
                <Row k="Alias" v={TRANSFER.alias} copy />
                {TRANSFER.cvu && <Row k="CVU" v={TRANSFER.cvu} copy />}
                {TRANSFER.titular && <Row k="Titular" v={TRANSFER.titular} />}
                {TRANSFER.banco && <Row k="Banco" v={TRANSFER.banco} />}
                <Row k="Importe" v={formatPrice(done.total)} />
              </dl>
              <p className="mt-3 text-xs text-muted">
                Hacé la transferencia y <b>subí el comprobante acá abajo</b> para que
                confirmemos tu pedido. 👇
              </p>
            </div>

            {compUp === "done" ? (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-accent/15 px-4 py-3 text-sm font-semibold text-primary">
                <CheckIcon className="h-5 w-5" /> ¡Comprobante recibido! Te confirmamos
                el pedido a la brevedad.
              </div>
            ) : (
              <label className="btn btn-secondary btn-lg mt-4 w-full cursor-pointer font-bold">
                {compUp === "up" ? "Subiendo…" : "📎 Subir comprobante"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={compUp === "up"}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    setCompUp("up");
                    try {
                      await uploadComprobante(done.id, f);
                      setCompUp("done");
                    } catch {
                      setCompUp("idle");
                    }
                  }}
                />
              </label>
            )}

            <a
              href={whatsappLink(waMsg)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-md mt-3 w-full bg-[#25D366] font-bold text-white hover:brightness-105"
            >
              <WhatsappIcon className="h-5 w-5" /> O avisanos por WhatsApp
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
    { v: "Transferencia", label: "Transferencia bancaria", hint: "10% de descuento. Subís el comprobante acá al confirmar (o lo mandás por WhatsApp)." },
    { v: "Mercado Pago", label: "Mercado Pago", hint: "Dinero en cuenta, débito o crédito. Te lleva a Mercado Pago." },
  ];

  return (
    <>
      <PageBanner title="Finalizar compra" crumbs={[{ label: "Checkout" }]} />
      <div className="container-page py-10">
        <form onSubmit={confirm} className="relative grid gap-8 lg:grid-cols-[1fr_360px]">
          <Trampa />
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

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field name="direccion" label="Dirección (calle y número)" required />
                </div>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    Localidad o barrio <span className="text-sale">*</span>
                  </span>
                  <input
                    name="ciudad"
                    required
                    value={localidad}
                    onChange={(e) => setLocalidad(e.target.value)}
                    autoComplete="address-level2"
                    placeholder="Ej.: Palermo, Castelar, Quilmes"
                    className="input h-11 text-base"
                  />
                </label>
                <Field name="cp" label="Código postal" required />

                {verSelectores ? (
                  <>
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-semibold text-ink">
                        Provincia <span className="text-sale">*</span>
                      </span>
                      <select
                        name="provincia"
                        required
                        value={provincia}
                        onChange={(e) => {
                          setManual(true);
                          setProvincia(e.target.value);
                          setPartido("");
                        }}
                        className="input h-11 text-base"
                      >
                        <option value="">Elegí tu provincia…</option>
                        {PROVINCIAS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </label>
                    {provincia === "Buenos Aires" && (
                      <label className="block">
                        <span className="mb-1.5 block text-sm font-semibold text-ink">
                          Partido <span className="text-sale">*</span>
                        </span>
                        <select
                          name="partido"
                          required
                          value={partido}
                          onChange={(e) => {
                            setManual(true);
                            setPartido(e.target.value);
                          }}
                          className="input h-11 text-base"
                        >
                          <option value="">Elegí tu partido…</option>
                          {ZONAS_ENVIO.filter((z) => z.id !== "capital").map((z) => (
                            <optgroup key={z.id} label={`${z.nombre} · ${formatPrice(z.precio)}`}>
                              {z.partidos.map((p) => (
                                <option key={p} value={p}>
                                  {p}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                          <optgroup label="Resto de la provincia · Vía Cargo">
                            <option value="Otro partido">Otro partido</option>
                          </optgroup>
                        </select>
                      </label>
                    )}
                  </>
                ) : (
                  <>
                    <input type="hidden" name="provincia" value={provincia} />
                    {partido && <input type="hidden" name="partido" value={partido} />}
                  </>
                )}
              </div>

              <div
                className={`mt-4 rounded-lg px-3 py-2.5 text-sm ${
                  envioInfo.tipo === "zona" ? "bg-accent-soft text-ink" : "bg-page-soft text-muted"
                }`}
                aria-live="polite"
              >
                {buscando ? (
                  <span>Buscando tu zona de envío…</span>
                ) : envioInfo.tipo === "zona" || envioInfo.tipo === "interior" ? (
                  <>
                    {detectada && !manual && (
                      <span className="block text-xs text-muted">
                        📍 {detectada.localidad}
                        {detectada.departamento && detectada.provincia === "Buenos Aires"
                          ? `, partido de ${detectada.departamento}`
                          : ""}
                        {detectada.provincia !== "CABA" && detectada.provincia !== "Buenos Aires"
                          ? ` · ${detectada.provincia}`
                          : ""}
                      </span>
                    )}
                    <span className="font-semibold text-ink">
                      {envioInfo.tipo === "zona" && (
                        <span
                          className="mr-2 inline-block h-3 w-3 rounded-full align-middle"
                          style={{ background: envioInfo.zona.color }}
                          aria-hidden
                        />
                      )}
                      {envioGratis ? `${envioInfo.etiqueta.replace(/:.*$/, "")}: ¡gratis!` : envioInfo.etiqueta}
                    </span>
                    {!manual && (
                      <button
                        type="button"
                        onClick={() => setManual(true)}
                        className="ml-2 text-xs font-semibold text-primary underline underline-offset-2"
                      >
                        ¿No es tu zona? Cambiar
                      </button>
                    )}
                  </>
                ) : faltaPartido ? (
                  <span>Elegí tu partido para calcular el envío.</span>
                ) : noReconocida ? (
                  <span>No reconocimos esa localidad. Elegí tu provincia{provincia === "Buenos Aires" ? " y partido" : ""}.</span>
                ) : (
                  <span>Escribí tu localidad o barrio y calculamos el envío.</span>
                )}
              </div>
              <p className="mt-2 text-xs text-muted">
                🛵 En Capital y GBA el envío va por motomensajería / logística propia. En el interior, por
                Vía Cargo (el costo se coordina por WhatsApp y no se suma acá).
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
                  <dt className="text-muted">
                    Envío
                    {envioInfo.tipo === "zona" && (
                      <span className="block text-xs">{envioInfo.resumen}</span>
                    )}
                  </dt>
                  <dd className="text-right font-medium text-ink">
                    {envioInfo.tipo === "interior"
                        ? "A coordinar"
                        : envioInfo.tipo === "pendiente"
                          ? "A calcular"
                          : envioGratis
                            ? "Gratis"
                            : formatPrice(shipping)}
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

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary btn-lg w-full sm:flex-1 disabled:opacity-60"
                >
                  {loading
                    ? "Procesando…"
                    : method === "Mercado Pago"
                      ? "Pago seguro"
                      : "Confirmar pedido"}
                </button>
                {/* Por si tocó "Comprar" sin querer: vuelve a la tienda sin perder el carrito */}
                <Link href="/productos" className="btn btn-outline btn-lg w-full sm:w-auto">
                  Seguir navegando
                </Link>
              </div>
              <p className="mt-3 text-center text-xs text-muted sm:text-left">
                Al confirmar aceptás los{" "}
                <Link href="/terminos/" className="font-semibold text-primary underline">
                  Términos y condiciones
                </Link>
                .
              </p>
            </div>
          </aside>
        </form>
      </div>
    </>
  );
}

function Row({ k, v, copy }: { k: string; v: string; copy?: boolean }) {
  const [ok, setOk] = useState(false);
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(v);
      setOk(true);
      setTimeout(() => setOk(false), 1800);
    } catch {
      /* sin portapapeles: el valor igual se ve */
    }
  };
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{k}</dt>
      <dd className="flex items-center gap-2 font-semibold text-ink">
        <span className="break-all">{v}</span>
        {copy && (
          <button
            type="button"
            onClick={doCopy}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${
              ok ? "bg-green-100 text-green-700" : "bg-primary text-white hover:brightness-110"
            }`}
          >
            {ok ? "Copiado ✓" : "Copiar"}
          </button>
        )}
      </dd>
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
