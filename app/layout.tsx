import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";
import { SITE } from "@/lib/config";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { ProductsProvider } from "@/context/ProductsContext";
import { CategoriesProvider } from "@/context/CategoriesContext";
import { PWARegister } from "@/components/PWARegister";

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
  metadataBase: new URL("https://suplemarket.com.ar"),
  manifest: "/manifest.webmanifest",
  applicationName: SITE.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: SITE.name,
  },
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
    "Suple Market",
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

// Entidades para Google: la tienda (Store) y el sitio (WebSite), con los temas
// del rubro enlazados a Wikipedia. Sin reseñas ni puntajes inventados.
const BASE = "https://suplemarket.com.ar";
const STORE_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Store",
      "@id": `${BASE}/#store`,
      name: SITE.name,
      alternateName: ["SupleMarket", "Suple Market Argentina"],
      description: SITE.description,
      url: `${BASE}/`,
      logo: `${BASE}/logo.png`,
      image: `${BASE}/logo.png`,
      telephone: "+5491151640472",
      areaServed: { "@type": "Country", name: "Argentina" },
      currenciesAccepted: "ARS",
      paymentAccepted: "Efectivo, Transferencia bancaria, Mercado Pago",
      sameAs: [SITE.instagram],
      knowsAbout: [
        "Suplementos deportivos",
        "Proteína whey",
        "Creatina monohidrato",
        "Nutrición deportiva",
        "Suplemento dietético",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${BASE}/#website`,
      url: `${BASE}/`,
      name: SITE.name,
      alternateName: ["SupleMarket", "suplemarket.com.ar"],
      inLanguage: "es-AR",
      publisher: { "@id": `${BASE}/#store` },
      about: [
        { "@type": "Thing", name: "Suplemento dietético", sameAs: "https://es.wikipedia.org/wiki/Suplemento_diet%C3%A9tico" },
        { "@type": "Thing", name: "Nutrición deportiva", sameAs: "https://es.wikipedia.org/wiki/Nutrici%C3%B3n_deportiva" },
        { "@type": "Thing", name: "Creatina", sameAs: "https://es.wikipedia.org/wiki/Creatina" },
      ],
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${BASE}/productos/?buscar={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export const viewport: Viewport = {
  themeColor: "#2129E3",
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
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(STORE_JSONLD).replace(/</g, "\\u003c"),
          }}
        />
        <PWARegister />
        <AuthProvider>
          <CategoriesProvider>
            <ProductsProvider>
              <CartProvider>{children}</CartProvider>
            </ProductsProvider>
          </CategoriesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
