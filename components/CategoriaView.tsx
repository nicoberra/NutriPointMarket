"use client";

import { Suspense } from "react";
import { Catalog } from "@/components/Catalog";
import { PageBanner } from "@/components/PageBanner";
import { useCategories } from "@/context/CategoriesContext";
import { categorySeo, categoryHref, SITE_URL } from "@/lib/seo";
import { deslugify } from "@/data/categories";
import { SeoFooter } from "@/components/SeoFooter";

/**
 * Página de una categoría: /categoria/<slug>/
 * H1 y primer párrafo con la palabra clave, el catálogo con la categoría ya
 * filtrada y, al pie, un H2 con texto corto. Usada por la página estática y
 * por el fallback de not-found (categorías creadas después del último deploy).
 */
export function CategoriaView({ slug, name: nameProp }: { slug: string; name?: string }) {
  const { categories } = useCategories();
  const name = categories.find((c) => c.slug === slug)?.name ?? nameProp ?? deslugify(slug);
  const seo = categorySeo(slug, name);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Productos", item: `${SITE_URL}/productos/` },
      { "@type": "ListItem", position: 3, name: seo.h1, item: `${SITE_URL}${categoryHref(slug)}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb).replace(/</g, "\u003c") }}
      />
      <PageBanner
        title={seo.h1}
        subtitle={seo.intro}
        crumbs={[{ label: "Productos", href: "/productos" }, { label: seo.h1 }]}
      />
      <Suspense fallback={<div className="container-page py-16 text-center text-sm text-muted">Cargando productos…</div>}>
        <Catalog initialCategory={slug} />
      </Suspense>
      <SeoFooter title={seo.h2} text={seo.body} />
    </>
  );
}
