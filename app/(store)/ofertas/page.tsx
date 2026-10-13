import { Suspense } from "react";
import type { Metadata } from "next";
import { Catalog } from "@/components/Catalog";
import { PageBanner } from "@/components/PageBanner";
import { SeoFooter } from "@/components/SeoFooter";
import { CatalogSkeleton } from "@/components/Estados";

export const metadata: Metadata = {
  title: "Ofertas en suplementos",
  alternates: { canonical: "/ofertas/" },
  description:
    "Ofertas en suplementos deportivos en Suple Market: descuentos vigentes en productos 100% originales, más 10% off por transferencia. ¡Aprovechalas!",
};

export default function OfertasPage() {
  return (
    <>
      <PageBanner
        title="Ofertas en suplementos"
        subtitle="Ofertas en suplementos deportivos seleccionados: aprovechá los descuentos vigentes."
        crumbs={[{ label: "Ofertas" }]}
      />
      <Suspense
        fallback={<CatalogSkeleton />}
      >
        <Catalog onlyOffers />
      </Suspense>
      <SeoFooter
        title="Descuentos en suplementos deportivos"
        text="Las ofertas se suman al 10% de descuento que tenés pagando por transferencia. Hacemos envíos a CABA, GBA y al interior del país por Vía Cargo."
      />
    </>
  );
}
