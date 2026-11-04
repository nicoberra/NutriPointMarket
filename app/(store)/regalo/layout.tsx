import type { Metadata } from "next";

/** Landing del regalo (destino de los llamados a la acción de Instagram). */
export const metadata: Metadata = {
  title: "Tu regalo",
  description: "Dejá tu WhatsApp y llevate un cupón de descuento para tu compra en Suple Market.",
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
