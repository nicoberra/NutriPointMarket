"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductoView } from "@/components/ProductoView";

/**
 * Compatibilidad con los links viejos /producto?slug=xxx: muestra el producto
 * y redirige a su URL propia /producto/xxx/.
 */
function Legacy() {
  const params = useSearchParams();
  const router = useRouter();
  const slug = params.get("slug") ?? "";

  useEffect(() => {
    if (slug) router.replace(`/producto/${slug}/`);
  }, [slug, router]);

  if (!slug) {
    return (
      <div className="container-page py-20 text-center text-sm text-muted">
        Producto no indicado.
      </div>
    );
  }
  return <ProductoView slug={slug} />;
}

export default function ProductoPage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-20 text-center text-sm text-muted">
          Cargando…
        </div>
      }
    >
      <Legacy />
    </Suspense>
  );
}
