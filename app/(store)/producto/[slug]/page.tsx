import type { Metadata } from "next";
import { getBuildProducts, absoluteImage } from "@/lib/build-products";
import { ProductoView } from "@/components/ProductoView";

/**
 * Página propia de cada producto: /producto/<slug>/
 * Se generan en el build para todos los productos (planilla en vivo + snapshot).
 * Un producto creado después del último deploy se muestra igual gracias al
 * fallback de app/not-found.tsx (hasta el próximo deploy, que lo incluye).
 */
export const dynamicParams = false;

export async function generateStaticParams() {
  const list = await getBuildProducts();
  return list.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const p = (await getBuildProducts()).find((x) => x.slug === params.slug);
  if (!p) return { title: "Producto" };
  const url = `https://suplemarket.com.ar/producto/${p.slug}/`;
  const description =
    p.description.slice(0, 160) || `${p.brand ? p.brand + " · " : ""}${p.name} en Suple Market.`;
  const img = absoluteImage(p.image);
  return {
    title: `${p.name} | Suple Market`,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: p.name,
      description,
      url,
      type: "website",
      images: img ? [{ url: img }] : [],
    },
    twitter: { card: img ? "summary_large_image" : "summary", title: p.name, description },
  };
}

export default function ProductoPage({ params }: { params: { slug: string } }) {
  return <ProductoView slug={params.slug} />;
}
