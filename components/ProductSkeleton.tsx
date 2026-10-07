/** Esqueleto de tarjeta de producto mientras cargan los datos. */
export function ProductSkeleton() {
  return (
    <div
      aria-hidden
      className="flex h-full animate-pulse flex-col overflow-hidden rounded-xl border border-line bg-surface motion-reduce:animate-none"
    >
      <div className="aspect-square w-full bg-page-soft" />
      <div className="space-y-2 p-3.5">
        <div className="h-2.5 w-16 rounded-full bg-page-soft" />
        <div className="h-3.5 w-11/12 rounded-full bg-page-soft" />
        <div className="h-3.5 w-2/3 rounded-full bg-page-soft" />
        <div className="mt-3 h-6 w-24 rounded-full bg-page-soft" />
        <div className="mt-3 h-10 w-full rounded-lg bg-page-soft" />
        <div className="h-10 w-full rounded-lg bg-page-soft" />
        <div className="h-10 w-full rounded-lg bg-page-soft" />
      </div>
    </div>
  );
}

/** Fila de esqueletos para los carruseles de la home. */
export function ProductSkeletonRow({ count = 4 }: { count?: number }) {
  return (
    <section className="container-page py-10 sm:py-14" aria-busy="true" aria-live="polite">
      <div className="mb-6 h-7 w-56 animate-pulse rounded-full bg-page-soft motion-reduce:animate-none" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: count }).map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}
