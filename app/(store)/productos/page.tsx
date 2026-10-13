import { Suspense } from "react";
import type { Metadata } from "next";
import { Catalog } from "@/components/Catalog";
import { PageBanner } from "@/components/PageBanner";
import { SeoFooter } from "@/components/SeoFooter";
import { CatalogSkeleton } from "@/components/Estados";

export const metadata: Metadata = {
  title: "Comprar suplementos online",
  alternates: { canonical: "/productos/" },
  description:
    "Comprar suplementos online en Suple Market: proteína whey, creatina, combos, pancakes proteicos y shakers 100% originales. 10% off por transferencia.",
};

export default function ProductosPage() {
  return (
    <>
      <PageBanner
        title="Comprar suplementos online"
        subtitle="Comprar suplementos online es simple: filtrá por categoría, marca y precio y encontrá tu suplemento ideal."
        crumbs={[{ label: "Productos" }]}
      />
      <Suspense fallback={<CatalogFallback />}>
        <Catalog />
      </Suspense>
      <SeoFooter
        title="Catálogo de suplementos deportivos"
        text="Proteínas y creatinas, combos, pancakes proteicos, shakers y más: todos los productos son 100% originales. Pagando por transferencia tenés 10% de descuento, y hacemos envíos a CABA, GBA y al interior del país por Vía Cargo."
      />
    </>
  );
}

function CatalogFallback() {
  return <CatalogSkeleton />;
}
