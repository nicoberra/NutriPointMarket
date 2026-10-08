import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Contactá a Suple Market: cómo comprar, entregas y medios de pago.",
  alternates: { canonical: "/contacto/" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
