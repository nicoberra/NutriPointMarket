import { Hero } from "@/components/Hero";
import { TrustStrip } from "@/components/TrustStrip";
import { CategorySection } from "@/components/CategorySection";
import { ProductCarousel } from "@/components/ProductCarousel";
import { PromoBannerRow } from "@/components/PromoBanner";
import { BrandCarousel } from "@/components/BrandCarousel";
import { Newsletter } from "@/components/Newsletter";
import { getOnSale, getFeatured, getBestSellers } from "@/data/products";

export default function HomePage() {
  const elegidos = getOnSale();
  const destacados = getFeatured();
  const masVendidos = getBestSellers();

  return (
    <>
      <Hero />
      <TrustStrip />

      <ProductCarousel
        eyebrow="Ofertas del mes"
        title="Nuestros elegidos del mes"
        products={elegidos}
        viewAllHref="/ofertas"
      />

      <CategorySection />

      <PromoBannerRow />

      <ProductCarousel
        eyebrow="Lo más elegido"
        title="Productos destacados"
        products={destacados}
        viewAllHref="/productos?orden=destacados"
      />

      <BrandCarousel />

      <ProductCarousel
        eyebrow="Ranking"
        title="Los más vendidos"
        products={masVendidos}
        viewAllHref="/productos?orden=mas-vendidos"
      />

      <Newsletter />
    </>
  );
}
