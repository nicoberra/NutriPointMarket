import { Hero } from "@/components/Hero";
import { TrustStrip } from "@/components/TrustStrip";
import { CategorySection } from "@/components/CategorySection";
import { HomeCarousel } from "@/components/HomeCarousel";
import { PromoBannerRow } from "@/components/PromoBanner";
import { BrandCarousel } from "@/components/BrandCarousel";
import { Newsletter } from "@/components/Newsletter";

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustStrip />

      <HomeCarousel kind="onSale" />

      <CategorySection />

      <PromoBannerRow />

      <HomeCarousel kind="featured" />

      <BrandCarousel />

      <HomeCarousel kind="bestSellers" />

      <Newsletter />
    </>
  );
}
