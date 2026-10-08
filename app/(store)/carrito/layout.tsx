import type { Metadata } from "next";

/** Página privada del proceso de compra: no tiene sentido que aparezca en Google. */
export const metadata: Metadata = {
  title: "Carrito",
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
