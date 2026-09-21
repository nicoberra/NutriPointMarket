import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/config";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { ProductsProvider } from "@/context/ProductsContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { ToastHost } from "@/components/ToastHost";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} | Suplementos deportivos`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [
    "suplementos deportivos",
    "proteínas",
    "creatina",
    "pre entreno",
    "vitaminas",
    "aminoácidos",
    "NutriPointMarket",
    "Argentina",
  ],
  openGraph: {
    title: `${SITE.name} | Suplementos deportivos`,
    description: SITE.description,
    type: "website",
    locale: "es_AR",
    siteName: SITE.name,
  },
};

export const viewport: Viewport = {
  themeColor: "#0C1E33",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR" className={`${inter.variable} ${sora.variable}`}>
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <ProductsProvider>
            <CartProvider>
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
              <CartDrawer />
              <WhatsAppButton />
              <ToastHost />
            </CartProvider>
          </ProductsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
