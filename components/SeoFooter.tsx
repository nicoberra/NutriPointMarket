/** Bloque corto al pie de un listado: H2 con la palabra clave + un párrafo. */
export function SeoFooter({ title, text }: { title: string; text: string }) {
  return (
    <section className="border-t border-line bg-page-soft">
      <div className="container-page py-10">
        <h2 className="font-display text-xl font-bold text-primary">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{text}</p>
      </div>
    </section>
  );
}
