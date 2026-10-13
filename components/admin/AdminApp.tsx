"use client";

import { useEffect, useState } from "react";
import { crmLogout, getCrmToken, setCrmToken, CRM_AUTH_EVENT } from "@/lib/api";
import { GlassyPinLogin } from "./GlassyPinLogin";
import { AdminProducts } from "./AdminProducts";
import { useProducts } from "@/context/ProductsContext";
import { AdminRecords, type RecordsConfig } from "./AdminRecords";
import { AdminDashboard } from "./AdminDashboard";
import { AdminBilling } from "./AdminBilling";
import { PullToRefresh } from "./PullToRefresh";
import { prefetchTables, clearTables } from "@/lib/tableCache";
import {
  GridIcon,
  PackageIcon,
  UserIcon,
  ClipboardIcon,
  ChartIcon,
  LogoutIcon,
  CheckIcon,
} from "@/components/Icons";

const AUTH_KEY = "npm-crm-auth-v1";

type Section = "dashboard" | "facturacion" | "productos" | "clientes" | "pedidos";

const NAV: { id: Section; label: string; Icon: typeof GridIcon }[] = [
  { id: "dashboard", label: "Inicio", Icon: GridIcon },
  { id: "facturacion", label: "Facturación", Icon: ChartIcon },
  { id: "productos", label: "Productos", Icon: PackageIcon },
  { id: "clientes", label: "Clientes", Icon: UserIcon },
  { id: "pedidos", label: "Pedidos", Icon: ClipboardIcon },
];

const CLIENTES_CFG: RecordsConfig = {
  tab: "Clientes",
  addLabel: "Nuevo usuario",
  segments: { mineLabel: "Mis usuarios", webLabel: "Usuarios web" },
  searchable: true,
  searchPlaceholder: "Buscar por nombre, email…",
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
    { key: "monto", label: "Monto (precio de venta)", type: "number" },
    { key: "costo", label: "Costo (lo que te costó)", type: "number" },
    {
      key: "pago",
      label: "Forma de pago",
      type: "select",
      options: ["Efectivo", "Transferencia", "Mercado Pago", "Otro"],
    },
    { key: "envio", label: "Envío (dirección/forma)" },
    { key: "notas", label: "Notas", type: "textarea" },
  ],
  primary: (r) => r.cliente,
  secondary: (r) =>
    [r.detalle, r.monto ? `$${r.monto}` : "", r.pago].filter(Boolean).join(" · "),
  estado: true,
  aprobar: true,
  deletable: true,
  detail: true,
};

export function AdminApp() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const { refresh: refreshProducts } = useProducts();
  const [section, setSection] = useState<Section>("dashboard");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    try {
      // Sesión persistente (30 días) + token de la API: sin token, el backend
      // rechaza todo, así que se vuelve al login.
      const exp = Number(localStorage.getItem(AUTH_KEY) || 0);
      if (exp && Date.now() < exp && getCrmToken()) setAuthed(true);
      else {
        localStorage.removeItem(AUTH_KEY);
        setCrmToken("");
      }
    } catch {
      /* ignore */
    }
    setReady(true);
    // Si la API rechaza el token (vencido o revocado), vuelve al login.
    const onAuth = () => {
      try {
        localStorage.removeItem(AUTH_KEY);
      } catch {
        /* ignore */
      }
      setAuthed(false);
    };
    window.addEventListener(CRM_AUTH_EVENT, onAuth);
    return () => window.removeEventListener(CRM_AUTH_EVENT, onAuth);
  }, []);

  // Con sesión iniciada: precarga Pedidos y Clientes en segundo plano, así
  // el Panel, Clientes, Pedidos y Facturación abren con datos al instante.
  useEffect(() => {
    if (authed) prefetchTables("Pedidos", "Clientes");
  }, [authed]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // El toast conserva el texto mientras sale (entrada y salida animadas).
  const [toastShown, setToastShown] = useState<string | null>(null);
  const [toastLeaving, setToastLeaving] = useState(false);
  useEffect(() => {
    if (toast) {
      setToastShown(toast);
      setToastLeaving(false);
      return;
    }
    if (!toastShown) return;
    setToastLeaving(true);
    const t = setTimeout(() => {
      setToastShown(null);
      setToastLeaving(false);
    }, 230);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const login = () => {
    try {
      // Guarda la sesión por 30 días.
      localStorage.setItem(AUTH_KEY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
    } catch {
      /* ignore */
    }
    setAuthed(true);
    // Con el token recién guardado, recarga los productos: así el CRM tiene
    // los costos (la tienda pública no los recibe) antes de editar nada.
    refreshProducts().catch(() => {});
  };

  const logout = () => {
    try {
      localStorage.removeItem(AUTH_KEY);
    } catch {
      /* ignore */
    }
    crmLogout().catch(() => {}); // revoca el token en el backend
    clearTables(); // borra los datos guardados en este navegador
    setAuthed(false);
  };

  if (!ready) return null;
  if (!authed) return <GlassyPinLogin onOk={login} />;

  const titles: Record<Section, string> = {
    dashboard: "Panel",
    facturacion: "Facturación",
    productos: "Productos",
    clientes: "Clientes",
    pedidos: "Pedidos",
  };

  return (
    <div className="crm-app min-h-screen bg-page-soft lg:flex lg:select-auto">
      <PullToRefresh />
      {/* Sidebar (solo desktop) */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-52 lg:flex-col lg:border-r lg:border-white/10 lg:bg-primary lg:text-white">
        <div className="px-5 py-6">
          <p className="text-[10px] uppercase tracking-widest text-white/50">
            Suple Market
          </p>
          <p className="font-display text-2xl font-black leading-none">CRM</p>
        </div>
        <nav className="relative flex-1 space-y-1 px-3">
          {/* Indicador del ítem activo: se desliza entre ítems (44px de paso) */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 right-3 top-0 h-10 rounded-lg bg-white/15 transition-transform duration-200 ease-move motion-reduce:transition-none"
            style={{ transform: `translateY(${Math.max(0, NAV.findIndex((n) => n.id === section)) * 44}px)` }}
          />
          {NAV.map(({ id, label, Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active ? "text-white" : "text-white/70 hover:bg-white/10"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            );
          })}
        </nav>
        <div className="m-3 space-y-1">
          <button
            onClick={() => window.location.reload()}
            title="Actualizar"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            Actualizar
          </button>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10"
          >
            <LogoutIcon className="h-5 w-5" /> Salir
          </button>
        </div>
      </aside>

      {/* Columna principal */}
      <div className="flex min-h-screen flex-1 flex-col lg:pl-52">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-primary px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] text-white lg:bg-white lg:px-8 lg:py-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-white/50 lg:hidden">
              Suple Market · CRM
            </p>
            <h1 className="font-display text-lg font-bold leading-tight lg:text-2xl lg:text-primary">
              {titles[section]}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => window.location.reload()}
              aria-label="Actualizar"
              title="Actualizar"
              className="grid h-9 w-9 place-items-center rounded-lg text-white/80 hover:bg-white/10 lg:hidden"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10 lg:hidden"
            >
              <LogoutIcon className="h-4.5 w-4.5" /> Salir
            </button>
          </div>
        </header>

        {/* Contenido */}
        <main className="w-full flex-1 p-4 pb-24 lg:p-8 lg:pb-10 2xl:px-12">
          <div key={section} className="animate-section-in motion-reduce:animate-none">
          {section === "dashboard" && (
            <AdminDashboard onGo={(s) => setSection(s)} />
          )}
          {section === "facturacion" && <AdminBilling />}
          {section === "productos" && <AdminProducts onToast={setToast} />}
          {section === "clientes" && (
            <AdminRecords config={CLIENTES_CFG} orderConfig={PEDIDOS_CFG} onToast={setToast} />
          )}
          {section === "pedidos" && (
            <AdminRecords config={PEDIDOS_CFG} onToast={setToast} />
          )}
          </div>
        </main>
      </div>

      {/* Bottom nav (solo mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-lg items-stretch justify-around border-t border-line bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
        <span
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-0.5 w-1/5 rounded-full bg-primary transition-transform duration-200 ease-move motion-reduce:transition-none"
          style={{ transform: `translateX(${Math.max(0, NAV.findIndex((n) => n.id === section)) * 100}%)` }}
        />
        {NAV.map(({ id, label, Icon }) => {
          const active = section === id;
          return (
            <button
              key={id}
              onClick={() => setSection(id)}
              className={`flex min-h-[48px] flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-semibold transition-[color,transform] active:scale-95 motion-reduce:transition-none ${
                active ? "text-primary" : "text-muted"
              }`}
            >
              <Icon className={`h-6 w-6 transition-transform duration-200 ease-enter motion-reduce:transition-none ${active ? "-translate-y-0.5" : ""}`} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* Toast */}
      {toastShown && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8 lg:pl-52">
          <div
            role="status"
            className={`flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-drawer ${
              toastLeaving ? "animate-toast-out" : "animate-toast-in"
            }`}
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-accent text-primary">
              <CheckIcon className="h-4 w-4" />
            </span>
            {toastShown}
          </div>
        </div>
      )}
    </div>
  );
}

