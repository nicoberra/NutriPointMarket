import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marcas de suplementos",
  description:
    "Marcas de suplementos en Suple Market: Star Nutrition, ENA, Granger y más, con productos 100% originales. 10% off por transferencia. ¡Conocelas!",
  alternates: { canonical: "/marcas/" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
