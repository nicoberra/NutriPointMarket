import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center justify-center py-24 text-center">
      <p className="font-display text-6xl font-black text-primary">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-primary">
        Página no encontrada
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        La página que buscás no existe o fue movida. Volvé al inicio o explorá
        nuestros productos.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn btn-primary btn-md">
          Ir al inicio
        </Link>
        <Link href="/productos" className="btn btn-outline btn-md">
          Ver productos
        </Link>
      </div>
    </div>
  );
}
