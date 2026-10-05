"use client";

import { useEffect, useState } from "react";
import { useProducts } from "@/context/ProductsContext";
import { listTable } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { UserIcon, ClipboardIcon, ChevronRightIcon } from "@/components/Icons";

type Section = "productos" | "clientes" | "pedidos" | "facturacion";

function num(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function parseDate(v: unknown): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}
const low = (v: unknown) => String(v ?? "").trim().toLowerCase();

export function AdminDashboard({ onGo }: { onGo: (s: Section) => void }) {
  const { products } = useProducts();
  const [m, setM] = useState({
    clientes: 0,
    pedidos: 0,
    pendEntrega: 0,
    pendPago: 0,
    sinComprobante: 0,
    mesRev: 0,
    mesProf: 0,
    semRev: 0,
    semProf: 0,
  });

  useEffect(() => {
    Promise.all([
      listTable<Record<string, unknown>>("Clientes"),
      listTable<Record<string, unknown>>("Pedidos"),
    ])
      .then(([clientes, pedidos]) => {
        const now = new Date();
        const mk = now.getFullYear() * 12 + now.getMonth();
        const wkStart = new Date(now);
        wkStart.setHours(0, 0, 0, 0);
        wkStart.setDate(wkStart.getDate() - ((wkStart.getDay() + 6) % 7)); // lunes

        let pendEntrega = 0,
          pendPago = 0,
          sinComprobante = 0,
          mesRev = 0,
          mesProf = 0,
          semRev = 0,
          semProf = 0;

        for (const r of pedidos) {
          const amount = num(r.monto);
          const cost = num(r.costo);
          const date = parseDate(r.fecha);
          const pagado = low(r.descontado) === "sí" || low(r.estado) === "pagado";
          const entregado = low(r.estado) === "entregado";
          const esTransfer = low(r.pago).includes("transfer");

          if (!entregado) pendEntrega++;
          if (!pagado) pendPago++;
          if (esTransfer && !String(r.comprobante ?? "").trim()) sinComprobante++;

          if (amount > 0 && date) {
            const prof = cost > 0 ? amount - cost : 0;
            if (date.getFullYear() * 12 + date.getMonth() === mk) {
              mesRev += amount;
              mesProf += prof;
            }
            if (date >= wkStart) {
              semRev += amount;
              semProf += prof;
            }
          }
        }

        setM({
          clientes: clientes.length,
          pedidos: pedidos.length,
          pendEntrega,
          pendPago,
          sinComprobante,
          mesRev,
          mesProf,
          semRev,
          semProf,
        });
      })
      .catch(() => {});
  }, []);

  const sinStock = products.filter((p) => p.inStock === false).slice(0, 8);

  return (
    <div className="space-y-5">
      {/* Clientes y Pedidos */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onGo("clientes")}
          className="flex flex-col items-start gap-2 rounded-xl border border-line bg-white p-4 text-left transition-colors active:bg-page-soft"
        >
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent-soft text-primary">
            <UserIcon className="h-5 w-5" />
          </span>
          <span className="font-display text-2xl font-black text-primary">{m.clientes}</span>
          <span className="text-xs font-medium text-muted">Clientes</span>
        </button>
        <button
          onClick={() => onGo("pedidos")}
          className="flex flex-col items-start gap-2 rounded-xl border border-line bg-white p-4 text-left transition-colors active:bg-page-soft"
        >
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent-soft text-primary">
            <ClipboardIcon className="h-5 w-5" />
          </span>
          <span className="font-display text-2xl font-black text-primary">{m.pedidos}</span>
          <span className="text-xs font-medium text-muted">Pedidos</span>
        </button>
      </div>

      {/* Resumen de pedidos */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-ink">Estado de los pedidos</h2>
        <div className="grid grid-cols-3 gap-3">
          <Mini label="Falta entregar" value={m.pendEntrega} tone="amber" onClick={() => onGo("pedidos")} />
          <Mini label="Falta cobrar" value={m.pendPago} tone="amber" onClick={() => onGo("pedidos")} />
          <Mini label="Sin comprobante" value={m.sinComprobante} tone="sale" onClick={() => onGo("pedidos")} />
        </div>
      </section>

      {/* Facturación y beneficio */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-ink">Facturación y beneficio</h2>
        <div className="grid grid-cols-2 gap-3">
          <Money label="Facturado este mes" value={m.mesRev} sub={`Semana: ${formatPrice(m.semRev)}`} />
          <Money
            label="Beneficio este mes"
            value={m.mesProf}
            sub={`Semana: ${formatPrice(m.semProf)}`}
            green
          />
        </div>
        <button
          onClick={() => onGo("facturacion")}
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-line bg-white p-4 text-sm font-semibold text-primary"
        >
          Ver facturación completa
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </section>

      {/* Sin stock */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-ink">Sin stock</h2>
        {sinStock.length === 0 ? (
          <p className="rounded-xl border border-dashed border-line bg-white py-6 text-center text-sm text-muted">
            Todos los productos con stock 👍
          </p>
        ) : (
          <ul className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0 lg:grid-cols-3">
            {sinStock.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-line bg-white p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                  <p className="text-xs text-muted">{formatPrice(p.price)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-sale/10 px-2.5 py-1 text-xs font-bold text-sale">
                  Sin stock
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Mini({
  label,
  value,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  tone: "amber" | "sale";
  onClick: () => void;
}) {
  const color =
    value === 0
      ? "text-muted"
      : tone === "sale"
        ? "text-sale"
        : "text-amber-600";
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-line bg-white p-3 text-center transition-colors active:bg-page-soft"
    >
      <p className={`font-display text-2xl font-black ${color}`}>{value}</p>
      <p className="mt-0.5 text-[11px] font-medium leading-tight text-muted">{label}</p>
    </button>
  );
}

function Money({
  label,
  value,
  sub,
  green,
}: {
  label: string;
  value: number;
  sub?: string;
  green?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        green ? "border-green-200 bg-green-50" : "border-line bg-white"
      }`}
    >
      <p
        className={`font-display text-xl font-black ${
          green ? "text-green-600" : "text-primary"
        }`}
      >
        {formatPrice(value)}
      </p>
      <p className="mt-1 text-xs font-semibold text-ink">{label}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  );
}
