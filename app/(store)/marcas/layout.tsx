import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marcas",
  description: "Las marcas de suplementos que trabajamos en Suple Market: productos 100% originales.",
  alternates: { canonical: "/marcas/" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
