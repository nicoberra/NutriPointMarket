import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "CRM",
  robots: { index: false, follow: false }, // panel privado: no indexar
  manifest: "/NutriPointMarket/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NutriPoint CRM",
  },
  icons: { apple: "/NutriPointMarket/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#0C1E33",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // evita el zoom al enfocar inputs en iPhone
  userScalable: false,
  viewportFit: "cover", // usa toda la pantalla (respeta el notch con safe-area)
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-page-soft">{children}</div>;
}
