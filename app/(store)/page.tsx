import { Hero } from "@/components/Hero";
import { TrustStrip } from "@/components/TrustStrip";
import { CategoryCarousel } from "@/components/CategoryCarousel";
import { ASSET_PREFIX } from "@/lib/config";
import { HomeCarousel } from "@/components/HomeCarousel";
import { PromoBannerRow } from "@/components/PromoBanner";
import { BrandCarousel } from "@/components/BrandCarousel";
import { Newsletter } from "@/components/Newsletter";

export default function HomePage() {
  return (
    <>
      {/* Fondo decorativo compartido: arranca desde las categorías y baja al hero */}
      <div className="relative overflow-hidden bg-page">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -right-24 top-0 h-[28rem] w-[28rem] rounded-full bg-accent/25 blur-3xl" />
          <div className="absolute -bottom-24 left-1/4 h-80 w-80 rounded-full bg-secondary/30 blur-3xl" />
        </div>
        <div className="relative">
          {/* Logo arriba de las categorías (solo en celular) */}
          <div className="flex justify-center px-4 pt-6 lg:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${ASSET_PREFIX}/logo.png`}
              alt="Suple Market"
              className="w-full max-w-[300px] object-contain"
            />
          </div>
          <CategoryCarousel />
          <Hero />
        </div>
      </div>

      <TrustStrip />

      <HomeCarousel kind="onSale" />

      <PromoBannerRow />

      <HomeCarousel kind="featured" />

      <BrandCarousel />

      <HomeCarousel kind="bestSellers" />

      <Newsletter />
    </>
  );
}
