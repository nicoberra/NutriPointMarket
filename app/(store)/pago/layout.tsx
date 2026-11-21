import type { Metadata } from "next";

/** Página privada del proceso de compra: no tiene sentido que aparezca en Google. */
export const metadata: Metadata = {
  title: "Estado del pago",
  robots: { index: false, follow: true },
};

// data-clarity-mask: Microsoft Clarity no graba nada de esta página (datos de clientes),
// ya desde el HTML (así no hay ni un instante sin enmascarar al navegar).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div data-clarity-mask="True">{children}</div>;
}
