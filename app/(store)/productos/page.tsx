import { Suspense } from "react";
import type { Metadata } from "next";
import { Catalog } from "@/components/Catalog";
import { PageBanner } from "@/components/PageBanner";

export const metadata: Metadata = {
  title: "Productos",
  description:
    "Todo el catálogo de Suple Market: proteínas, creatinas, pre entrenos, vitaminas, aminoácidos y más.",
};

export default function ProductosPage() {
  return (
    <>
      <PageBanner
        title="Todos los productos"
        subtitle="Filtrá por categoría, marca y precio para encontrar tu suplemento ideal."
        crumbs={[{ label: "Productos" }]}
      />
      <Suspense fallback={<CatalogFallback />}>
        <Catalog />
      </Suspense>
    </>
  );
}

function CatalogFallback() {
  return (
    <div className="container-page py-16 text-center text-sm text-muted">
      Cargando productos…
    </div>
  );
}
