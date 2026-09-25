import { Suspense } from "react";
import type { Metadata } from "next";
import { Catalog } from "@/components/Catalog";
import { PageBanner } from "@/components/PageBanner";

export const metadata: Metadata = {
  title: "Ofertas",
  description: "Todas las ofertas y descuentos de Suple Market.",
};

export default function OfertasPage() {
  return (
    <>
      <PageBanner
        title="Ofertas"
        subtitle="Aprovechá los descuentos vigentes en suplementos seleccionados."
        crumbs={[{ label: "Ofertas" }]}
      />
      <Suspense
        fallback={
          <div className="container-page py-16 text-center text-sm text-muted">
            Cargando ofertas…
          </div>
        }
      >
        <Catalog onlyOffers />
      </Suspense>
    </>
  );
}
