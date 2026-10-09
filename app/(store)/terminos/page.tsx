import type { Metadata } from "next";
import { SITE } from "@/lib/config";
import { PageBanner } from "@/components/PageBanner";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: `Términos y condiciones y política de privacidad de ${SITE.name}.`,
  alternates: { canonical: "/terminos/" },
};

const H = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <h2 id={id} className="mt-10 scroll-mt-28 font-display text-xl font-bold text-primary sm:text-2xl">
    {children}
  </h2>
);

export default function TerminosPage() {
  return (
    <>
      <PageBanner title="Términos y condiciones" crumbs={[{ label: "Términos y condiciones" }]} />
      <div className="container-page max-w-3xl py-10 text-sm leading-relaxed text-ink sm:text-base">
        <p className="text-muted">
          Al navegar en {SITE.name}, crear una cuenta o realizar una compra aceptás estos términos y nuestra
          política de privacidad. Si tenés dudas, escribinos a {SITE.email}.
        </p>

        <H id="cuenta">1. Cuenta y uso de la tienda</H>
        <p className="mt-3">
          Para comprar podés crear una cuenta o completar tus datos en el checkout. Sos responsable de que la
          información que cargás sea correcta y de mantener tu contraseña en privado. Podés pedirnos que
          eliminemos tu cuenta en cualquier momento.
        </p>

        <H id="datos">2. Datos que guardamos</H>
        <p className="mt-3">
          Guardamos los datos necesarios para gestionar tus compras: nombre, email, teléfono, DNI o CUIT y
          dirección de envío, además del historial de pedidos. No guardamos datos de tarjetas: los pagos con
          tarjeta se procesan en Mercado Pago.
        </p>

        <H id="promocion">3. Uso de tus datos para comunicaciones y promoción</H>
        <p className="mt-3">
          Al crear tu cuenta o realizar una compra autorizás a {SITE.name} a usar tus datos de contacto para
          comunicarnos con vos sobre tus pedidos y para enviarte novedades, promociones, descuentos y
          lanzamientos por email, WhatsApp u otros medios. También autorizás a {SITE.name} a utilizar la
          información de tus compras, opiniones y mensajes de forma anónima o con tu nombre de pila para
          promocionar la tienda, su sistema y sus productos en el sitio web, redes sociales y otros canales.
          Podés revocar esta autorización cuando quieras escribiéndonos a {SITE.email} o respondiendo a
          cualquiera de nuestros mensajes.
        </p>

        <H id="privacidad">4. Política de privacidad</H>
        <p className="mt-3">
          Tus datos se guardan en sistemas de acceso restringido y solo los usa {SITE.name}. No los vendemos
          ni los cedemos a terceros, salvo a los proveedores necesarios para operar la tienda (por ejemplo,
          Mercado Pago para los pagos y las empresas de envío para las entregas). De acuerdo con la Ley
          25.326 de Protección de Datos Personales, podés pedir el acceso, la corrección o la eliminación de
          tus datos escribiéndonos a {SITE.email}.
        </p>

        <H id="compras">5. Precios, pagos y stock</H>
        <p className="mt-3">
          Los precios están expresados en pesos argentinos e incluyen impuestos. El precio con transferencia
          se muestra en cada producto. Los medios de pago disponibles son transferencia bancaria y Mercado
          Pago. Un pedido queda confirmado cuando recibimos el pago. Si un producto se queda sin stock después
          de tu compra, te avisamos y te devolvemos el dinero o te ofrecemos un reemplazo.
        </p>

        <H id="envios">6. Envíos y entregas</H>
        <p className="mt-3">
          Coordinamos la entrega por WhatsApp. En la zona de entrega el envío es por motomensajería o
          logística propia; fuera de la zona, por Vía Cargo u otra empresa de transporte. Los tiempos de
          entrega son estimados y pueden variar.
        </p>

        <H id="cambios">7. Cambios y devoluciones</H>
        <p className="mt-3">
          Si un producto llega dañado o no es el que pediste, escribinos dentro de los 10 días de recibido y
          lo cambiamos o te devolvemos el dinero. Por ser suplementos alimenticios, no se aceptan cambios de
          productos abiertos o usados, salvo por fallas de fabricación.
        </p>

        <H id="contacto">8. Contacto</H>
        <p className="mt-3">
          {SITE.name} · {SITE.email} · WhatsApp {SITE.phone}. Defensa de las y los consumidores: para
          reclamos ingresá en{" "}
          <a
            href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline"
          >
            argentina.gob.ar/defensadelconsumidor
          </a>
          .
        </p>
      </div>
    </>
  );
}
