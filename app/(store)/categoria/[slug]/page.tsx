import type { Metadata } from "next";
import { CategoriaView } from "@/components/CategoriaView";
import { getBuildCategories } from "@/lib/build-products";
import { categorySeo, categoryHref, SITE_URL } from "@/lib/seo";

/**
 * Página propia de cada categoría: /categoria/<slug>/ (indexable, con su
 * palabra clave). Los links viejos /productos?categoria=<slug> siguen andando.
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  return (await getBuildCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const cat = (await getBuildCategories()).find((c) => c.slug === params.slug);
  const seo = categorySeo(params.slug, cat?.name ?? params.slug);
  const url = `${SITE_URL}${categoryHref(params.slug)}`;
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: url },
    openGraph: { title: `${seo.title} | Suple Market`, description: seo.description, url, type: "website" },
  };
}

export default async function CategoriaPage({ params }: { params: { slug: string } }) {
  const cat = (await getBuildCategories()).find((c) => c.slug === params.slug);
  return <CategoriaView slug={params.slug} name={cat?.name} />;
}
