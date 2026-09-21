"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { products } from "@/data/products";
import { PageBanner } from "@/components/PageBanner";
import { ProductCard } from "@/components/ProductCard";
import { UserIcon, HeartIcon } from "@/components/Icons";

export default function CuentaPage() {
  const { user, ready, login, register, logout } = useAuth();
  const { favorites } = useCart();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const favProducts = products.filter((p) => favorites.includes(p.id));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res =
      mode === "login"
        ? login(email, password)
        : register(name, email, password);
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
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input h-11"
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
              />
            </div>

            {error && (
              <p className="rounded-lg bg-sale/10 px-3 py-2 text-sm text-sale">{error}</p>
            )}

            <button type="submit" className="btn btn-primary btn-lg w-full">
              {mode === "login" ? "Ingresar" : "Crear mi cuenta"}
            </button>
          </form>

          <p className="mt-5 rounded-lg bg-page-soft px-3 py-2.5 text-center text-xs text-muted">
            Demostración: las cuentas se guardan en tu navegador. Luego se conectará
            al sistema real de NutriPointMarket.
          </p>
        </div>
      </div>
    </>
  );
}
