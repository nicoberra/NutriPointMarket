"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useProducts } from "@/context/ProductsContext";
import { PageBanner } from "@/components/PageBanner";
import { ProductCard } from "@/components/ProductCard";
import { UserIcon, HeartIcon } from "@/components/Icons";

export default function CuentaPage() {
  const { user, ready, login, register, logout } = useAuth();
  const { favorites } = useCart();
  const { products } = useProducts();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const favProducts = products.filter((p) => favorites.includes(p.id));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res =
      mode === "login"
        ? await login(email, password)
        : await register(name, email, password);
    setLoading(false);
    if (!res.ok) setError(res.error ?? "Ocurrió un error.");
  };

  if (!ready) {
    return (
      <>
        <PageBanner title="Mi cuenta" crumbs={[{ label: "Mi cuenta" }]} />
        <div className="container-page py-16 text-center text-sm text-muted">Cargando…</div>
      </>
    );
  }

  // ----- Usuario logueado: panel de cuenta -----
  if (user) {
    return (
      <>
        <PageBanner title="Mi cuenta" crumbs={[{ label: "Mi cuenta" }]} />
        <div className="container-page py-10">
          <div className="mb-10 flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-white p-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-primary">
                <UserIcon className="h-7 w-7" />
              </span>
              <div>
                <p className="font-display text-lg font-bold text-primary">
                  Hola, {user.name}
                </p>
                <p className="text-sm text-muted">{user.email}</p>
              </div>
            </div>
            <button onClick={logout} className="btn btn-outline btn-md">
              Cerrar sesión
            </button>
          </div>

          <section id="favoritos" className="scroll-mt-40">
            <h2 className="mb-5 flex items-center gap-2 font-display text-xl font-bold text-primary">
              <HeartIcon className="h-5 w-5" /> Mis favoritos
              <span className="text-sm font-normal text-muted">({favProducts.length})</span>
            </h2>
            {favProducts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-white py-16 text-center">
                <p className="font-semibold text-ink">Todavía no tenés favoritos</p>
                <p className="mt-1 text-sm text-muted">
                  Tocá el corazón en cualquier producto para guardarlo acá.
                </p>
                <Link href="/productos" className="btn btn-primary btn-md mt-4">
                  Explorar productos
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {favProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </section>
        </div>
      </>
    );
  }

  // ----- No logueado: login / registro -----
  return (
    <>
      <PageBanner title="Mi cuenta" crumbs={[{ label: "Mi cuenta" }]} />
      <div className="container-page py-12">
        <div className="mx-auto max-w-md rounded-2xl border border-line bg-white p-6 shadow-card sm:p-8">
          <div className="mb-6 grid grid-cols-2 rounded-lg bg-page-soft p-1">
            <button
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              className={`rounded-md py-2 text-sm font-semibold transition-colors ${
                mode === "login" ? "bg-white text-primary shadow-soft" : "text-muted"
              }`}
            >
              Ingresar
            </button>
            <button
              onClick={() => {
                setMode("register");
                setError(null);
              }}
              className={`rounded-md py-2 text-sm font-semibold transition-colors ${
                mode === "register" ? "bg-white text-primary shadow-soft" : "text-muted"
              }`}
            >
              Crear cuenta
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-ink">
                  Nombre y apellido
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input h-11"
                  placeholder="Tu nombre"
                  autoComplete="name"
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input h-11"
                placeholder="tu@email.com"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-ink">Contraseña</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input h-11 pr-11"
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-primary"
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                      <path d="M9.4 5.2A9.5 9.5 0 0112 5c5 0 9 4.5 9 7a12 12 0 01-2.2 3.1M6.2 6.2A12.4 12.4 0 003 12c0 2.5 4 7 9 7a9.4 9.4 0 004-.9" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-sale/10 px-3 py-2 text-sm text-sale">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg w-full"
            >
              {loading
                ? "Un momento…"
                : mode === "login"
                  ? "Ingresar"
                  : "Crear mi cuenta"}
            </button>
          </form>

          <p className="mt-5 rounded-lg bg-page-soft px-3 py-2.5 text-center text-xs text-muted">
            Tus datos se guardan de forma segura. Al crear tu cuenta aceptás los{" "}
            <Link href="/terminos/" className="font-semibold text-primary underline">
              Términos y condiciones
            </Link>
            .
          </p>
        </div>
      </div>
    </>
  );
}
