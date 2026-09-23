"use client";

import { useEffect, useState } from "react";
import { useProducts } from "@/context/ProductsContext";
import { listTable } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import {
  PackageIcon,
  UserIcon,
  ClipboardIcon,
  BellIcon,
  ChevronRightIcon,
} from "@/components/Icons";

type Section = "productos" | "clientes" | "pedidos" | "seguimientos";

export function AdminDashboard({ onGo }: { onGo: (s: Section) => void }) {
  const { products } = useProducts();
  const [counts, setCounts] = useState({ clientes: 0, pedidos: 0, seguimientos: 0 });

  useEffect(() => {
    Promise.all([
      listTable("Clientes"),
      listTable("Pedidos"),
      listTable("Seguimientos"),
    ])
      .then(([c, p, s]) =>
        setCounts({ clientes: c.length, pedidos: p.length, seguimientos: s.length }),
      )
      .catch(() => {});
  }, []);

  const sinStock = products.filter((p) => p.inStock === false).slice(0, 8);

  const cards = [
    { id: "productos" as const, label: "Productos", value: products.length, Icon: PackageIcon },
    { id: "clientes" as const, label: "Clientes", value: counts.clientes, Icon: UserIcon },
    { id: "pedidos" as const, label: "Pedidos", value: counts.pedidos, Icon: ClipboardIcon },
    { id: "seguimientos" as const, label: "Recompra", value: counts.seguimientos, Icon: BellIcon },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(({ id, label, value, Icon }) => (
          <button
            key={id}
            onClick={() => onGo(id)}
            className="flex flex-col items-start gap-2 rounded-xl border border-line bg-white p-4 text-left transition-colors active:bg-page-soft"
          >
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-accent-soft text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <span className="font-display text-2xl font-black text-primary">{value}</span>
            <span className="text-xs font-medium text-muted">{label}</span>
          </button>
        ))}
      </div>

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

      <button
        onClick={() => onGo("productos")}
        className="flex w-full items-center justify-between rounded-xl border border-line bg-white p-4 text-sm font-semibold text-primary"
      >
        Gestionar productos y precios
        <ChevronRightIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
