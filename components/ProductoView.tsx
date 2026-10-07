"use client";

import Link from "next/link";
import { useProducts } from "@/context/ProductsContext";
import { categoryMap } from "@/data/categories";
import { ProductDetail } from "@/components/ProductDetail";
import { RelatedProducts } from "@/components/RelatedProducts";
import { PageBanner } from "@/components/PageBanner";

/** Ficha de un producto por slug (usada por /producto/<slug>/ y el fallback). */
export function ProductoView({ slug }: { slug: string }) {
  const { getBySlug, loading } = useProducts();
  const product = getBySlug(slug);

  if (!product) {
    // Mientras carga la planilla o si el producto no existe / no tiene foto
    return (
      <div className="container-page py-20 text-center">
        {loading ? (
          <p className="text-sm text-muted">Cargando producto…</p>
        ) : (
          <>
            <h1 className="font-display text-xl font-bold text-primary">
              Producto no encontrado
            </h1>
            <p className="mt-2 text-sm text-muted">
              Puede que ya no esté disponible.
            </p>
            <Link href="/productos" className="btn btn-primary btn-md mt-5">
              Ver productos
            </Link>
          </>
        )}
      </div>
    );
  }

  const category = categoryMap[product.category];

  return (
    <>
      <PageBanner
        title={product.name}
        crumbs={[
          { label: "Productos", href: "/productos" },
          {
            label: category?.name ?? "",
            href: `/productos?categoria=${product.category}`,
          },
          { label: product.name },
        ]}
      />
      <ProductDetail product={product} />
      <div className="border-t border-line bg-page-soft">
        <RelatedProducts slug={product.slug} />
      </div>
    </>
  );
}
