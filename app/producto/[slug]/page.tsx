import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelated, products } from "@/data/products";
import { brandName } from "@/data/brands";
import { categoryMap } from "@/data/categories";
import { ProductDetail } from "@/components/ProductDetail";
import { ProductCarousel } from "@/components/ProductCarousel";
import { PageBanner } from "@/components/PageBanner";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const product = getProductBySlug(params.slug);
  if (!product) return { title: "Producto no encontrado" };
  return {
    title: `${product.name} · ${brandName(product.brand)}`,
    description: product.description,
  };
}

export default function ProductoPage({ params }: { params: { slug: string } }) {
  const product = getProductBySlug(params.slug);
  if (!product) notFound();

  const related = getRelated(product);
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
        <ProductCarousel title="Productos relacionados" products={related} />
      </div>
    </>
  );
}
