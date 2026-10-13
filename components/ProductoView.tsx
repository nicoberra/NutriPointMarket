"use client";

import Link from "next/link";
import { useProducts } from "@/context/ProductsContext";
import { categoryMap } from "@/data/categories";
import { ProductDetail } from "@/components/ProductDetail";
import { RelatedProducts } from "@/components/RelatedProducts";
import { PageBanner } from "@/components/PageBanner";
import { brandName } from "@/data/brands";
import { categoryHref } from "@/lib/seo";

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

  // Datos estructurados de producto (Google: precio, stock y marca en los resultados).
  // Se generan con los datos EN VIVO de la planilla, así el precio siempre coincide
  // con el que ve el cliente (aunque cambie sin un nuevo deploy).
  const url = `https://suplemarket.com.ar/producto/${product.slug}/`;
  const abs = (src: string) => (src.startsWith("http") ? src : `https://suplemarket.com.ar${src}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url,
    sku: product.slug,
    ...(product.images?.length ? { image: product.images.map(abs) } : product.image ? { image: [abs(product.image)] } : {}),
    ...(product.description ? { description: product.description.slice(0, 5000) } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: brandName(product.brand) } } : {}),
    ...(category?.name ? { category: category.name } : {}),
    ...(product.price > 0
      ? {
          offers: {
            "@type": "Offer",
            url,
            priceCurrency: "ARS",
            price: product.price,
            availability:
              product.inStock === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
            itemCondition: "https://schema.org/NewCondition",
            seller: { "@type": "Organization", name: "Suple Market" },
          },
        }
      : {}),
  };

  // Ruta de navegación para Google: Inicio › Productos › Categoría › Producto
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: "https://suplemarket.com.ar/" },
      { "@type": "ListItem", position: 2, name: "Productos", item: "https://suplemarket.com.ar/productos/" },
      ...(category?.name
        ? [
            {
              "@type": "ListItem",
              position: 3,
              name: category.name,
              item: `https://suplemarket.com.ar${categoryHref(product.category)}`,
            },
          ]
        : []),
      { "@type": "ListItem", position: category?.name ? 4 : 3, name: product.name, item: url },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\\u003c") }}
      />
      <PageBanner
        titleAs="p"
        title={product.name}
        crumbs={[
          { label: "Productos", href: "/productos" },
          {
            label: category?.name ?? "",
            href: categoryHref(product.category),
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
