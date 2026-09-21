import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "CRM",
  robots: { index: false, follow: false }, // panel privado: no indexar
};

export const viewport: Viewport = {
  themeColor: "#0C1E33",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // evita el zoom al enfocar inputs en iPhone
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-page-soft">{children}</div>;
}
