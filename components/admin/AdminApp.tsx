"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { crmLogin } from "@/lib/api";
import { AdminProducts } from "./AdminProducts";
import { AdminRecords, type RecordsConfig } from "./AdminRecords";
import { AdminDashboard } from "./AdminDashboard";
import {
  GridIcon,
  PackageIcon,
  UserIcon,
  ClipboardIcon,
  BellIcon,
  LogoutIcon,
  CheckIcon,
} from "@/components/Icons";

const AUTH_KEY = "npm-crm-auth-v1";

type Section = "dashboard" | "productos" | "clientes" | "pedidos" | "seguimientos";

const NAV: { id: Section; label: string; Icon: typeof GridIcon }[] = [
  { id: "dashboard", label: "Inicio", Icon: GridIcon },
  { id: "productos", label: "Productos", Icon: PackageIcon },
  { id: "clientes", label: "Clientes", Icon: UserIcon },
  { id: "pedidos", label: "Pedidos", Icon: ClipboardIcon },
  { id: "seguimientos", label: "Recompra", Icon: BellIcon },
];

const CLIENTES_CFG: RecordsConfig = {
  tab: "Clientes",
  addLabel: "Agregar cliente",
  fields: [
    { key: "nombre", label: "Nombre", required: true },
    { key: "telefono", label: "Teléfono", type: "tel" },
    { key: "email", label: "Email" },
    { key: "ciudad", label: "Ciudad" },
    { key: "dni", label: "DNI / CUIT" },
    { key: "direccion", label: "Dirección" },
    { key: "notas", label: "Notas", type: "textarea" },
  ],
  primary: (r) => r.nombre,
  secondary: (r) => [r.telefono, r.email, r.ciudad].filter(Boolean).join(" · "),
};

const PEDIDOS_CFG: RecordsConfig = {
  tab: "Pedidos",
  addLabel: "Agregar pedido",
  fields: [
    { key: "cliente", label: "Cliente", required: true },
    { key: "telefono", label: "Teléfono", type: "tel" },
    { key: "detalle", label: "Detalle", type: "textarea" },
    { key: "monto", label: "Monto", type: "number" },
    { key: "envio", label: "Envío (dirección/forma)" },
    { key: "notas", label: "Notas", type: "textarea" },
  ],
  primary: (r) => r.cliente,
  secondary: (r) =>
    [r.detalle, r.monto ? `$${r.monto}` : ""].filter(Boolean).join(" · "),
  estado: true,
};

const SEGUIMIENTOS_CFG: RecordsConfig = {
  tab: "Seguimientos",
  addLabel: "Agregar recompra",
  fields: [
    { key: "cliente", label: "Cliente", required: true },
    { key: "telefono", label: "Teléfono", type: "tel" },
    { key: "motivo", label: "Motivo (ej: se le termina el bote)" },
    { key: "fechaObjetivo", label: "Fecha objetivo", type: "date" },
    { key: "notas", label: "Notas", type: "textarea" },
  ],
  primary: (r) => r.cliente,
  secondary: (r) =>
    [r.motivo, r.fechaObjetivo ? `→ ${r.fechaObjetivo}` : ""].filter(Boolean).join(" · "),
  estado: true,
};

export function AdminApp() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [section, setSection] = useState<Section>("dashboard");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(AUTH_KEY) === "1") setAuthed(true);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const login = () => {
    try {
      sessionStorage.setItem(AUTH_KEY, "1");
    } catch {
      /* ignore */
    }
    setAuthed(true);
  };

  const logout = () => {
    try {
      sessionStorage.removeItem(AUTH_KEY);
    } catch {
      /* ignore */
    }
    setAuthed(false);
  };

  if (!ready) return null;
  if (!authed) return <Login onOk={login} />;

  const titles: Record<Section, string> = {
    dashboard: "Panel",
    productos: "Productos",
    clientes: "Clientes",
    pedidos: "Pedidos",
    seguimientos: "Recompra",
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-primary px-4 py-3 text-white">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/50">
            NutriPoint · CRM
          </p>
          <h1 className="font-display text-lg font-bold leading-tight">
            {titles[section]}
          </h1>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
        >
          <LogoutIcon className="h-4.5 w-4.5" /> Salir
        </button>
      </header>

      {/* Contenido */}
      <main className="flex-1 p-4 pb-24">
        {section === "dashboard" && (
          <AdminDashboard onGo={(s) => setSection(s)} />
        )}
        {section === "productos" && <AdminProducts onToast={setToast} />}
        {section === "clientes" && (
          <AdminRecords config={CLIENTES_CFG} onToast={setToast} />
        )}
        {section === "pedidos" && (
          <AdminRecords config={PEDIDOS_CFG} onToast={setToast} />
        )}
        {section === "seguimientos" && (
          <AdminRecords config={SEGUIMIENTOS_CFG} onToast={setToast} />
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-lg items-stretch justify-around border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
        {NAV.map(({ id, label, Icon }) => {
          const active = section === id;
          return (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <Icon className="h-6 w-6" />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Toast */}
      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
          <div className="flex animate-toast-in items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-drawer">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-primary">
              <CheckIcon className="h-4 w-4" />
            </span>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Login ---------------------------------- */

function Login({ onOk }: { onOk: () => void }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const ok = await crmLogin(pin);
    setLoading(false);
    if (ok) onOk();
    else setError("PIN incorrecto. Probá de nuevo.");
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-7 shadow-card">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-accent font-display text-2xl font-black text-primary">
            N
          </span>
          <h1 className="font-display text-xl font-extrabold text-primary">
            NutriPoint <span className="text-accent">CRM</span>
          </h1>
          <p className="mt-1 text-sm text-muted">Panel privado. Ingresá tu PIN.</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••••"
            className="input h-12 text-center text-lg tracking-[0.5em]"
          />
          {error && (
            <p className="rounded-lg bg-sale/10 px-3 py-2 text-center text-sm text-sale">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="btn btn-primary btn-lg w-full"
          >
            {loading ? "Verificando…" : "Ingresar"}
          </button>
        </form>
        <Link
          href="/"
          className="mt-5 block text-center text-xs font-semibold text-muted hover:text-accent"
        >
          ← Volver a la tienda
        </Link>
      </div>
    </div>
  );
}
