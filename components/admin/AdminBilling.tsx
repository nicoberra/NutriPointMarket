"use client";

import { useEffect, useMemo, useState } from "react";
import { listTable } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { ChartIcon } from "@/components/Icons";

/**
 * CRM · Facturación. Lee la pestaña Pedidos y arma el resumen de ventas por
 * semana / mes / año, promedios y el detalle Por año / Por mes / Por semana.
 * (El beneficio/ganancia se agrega en una segunda etapa, con el costo.)
 */

type Sale = { amount: number; date: Date };

function parseAmount(v: unknown): number {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function parseDate(v: unknown): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s.replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}
function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // lunes = 0
  x.setDate(x.getDate() - day);
  return x;
}
function dm(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function AdminBilling() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listTable<Record<string, unknown>>("Pedidos")
      .then((rows) => {
        const s: Sale[] = [];
        for (const r of rows) {
          const amount = parseAmount(r.monto);
          const date = parseDate(r.fecha);
          if (amount > 0 && date) s.push({ amount, date });
        }
        setSales(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now);
    const monthKey = now.getFullYear() * 12 + now.getMonth();
    const year = now.getFullYear();

    let wRev = 0, wCnt = 0, mRev = 0, mCnt = 0, yRev = 0, yCnt = 0, totRev = 0, totCnt = 0;
    const byYear = new Map<number, { rev: number; cnt: number }>();
    const byMonth = new Map<string, { rev: number; cnt: number; y: number; m: number }>();
    const byWeek = new Map<number, { rev: number; cnt: number; start: Date }>();
    const weeksWith = new Set<number>();
    const monthsWith = new Set<number>();

    for (const s of sales) {
      totRev += s.amount;
      totCnt++;
      const ws = startOfWeek(s.date);
      const wk = ws.getTime();
      const mk = s.date.getFullYear() * 12 + s.date.getMonth();
      if (s.date >= weekStart) { wRev += s.amount; wCnt++; }
      if (mk === monthKey) { mRev += s.amount; mCnt++; }
      if (s.date.getFullYear() === year) { yRev += s.amount; yCnt++; }

      const yy = byYear.get(s.date.getFullYear()) ?? { rev: 0, cnt: 0 };
      yy.rev += s.amount; yy.cnt++; byYear.set(s.date.getFullYear(), yy);
      const mKey = `${s.date.getFullYear()}-${s.date.getMonth()}`;
      const mm = byMonth.get(mKey) ?? { rev: 0, cnt: 0, y: s.date.getFullYear(), m: s.date.getMonth() };
      mm.rev += s.amount; mm.cnt++; byMonth.set(mKey, mm);
      const ww = byWeek.get(wk) ?? { rev: 0, cnt: 0, start: ws };
      ww.rev += s.amount; ww.cnt++; byWeek.set(wk, ww);
      weeksWith.add(wk); monthsWith.add(mk);
    }

    const nWeeks = Math.max(weeksWith.size, 1);
    const nMonths = Math.max(monthsWith.size, 1);
    return {
      week: { rev: wRev, cnt: wCnt },
      month: { rev: mRev, cnt: mCnt },
      year: { rev: yRev, cnt: yCnt },
      avgSalesWeek: totCnt / nWeeks,
      avgSalesMonth: totCnt / nMonths,
      avgRevWeek: totRev / nWeeks,
      avgRevMonth: totRev / nMonths,
      years: Array.from(byYear.entries())
        .map(([y, v]) => ({ y, ...v }))
        .sort((a, b) => b.y - a.y),
      months: Array.from(byMonth.values()).sort(
        (a, b) => b.y * 12 + b.m - (a.y * 12 + a.m),
      ),
      weeks: Array.from(byWeek.values()).sort(
        (a, b) => b.start.getTime() - a.start.getTime(),
      ),
    };
  }, [sales]);

  if (loading) {
    return <p className="py-10 text-center text-sm text-muted">Cargando…</p>;
  }
  if (sales.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-white py-12 text-center text-sm text-muted">
        Todavía no hay ventas cargadas. Cargá pedidos con monto y fecha para ver
        la facturación.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BigCard label="Esta semana" rev={stats.week.rev} cnt={stats.week.cnt} />
        <BigCard label="Este mes" rev={stats.month.rev} cnt={stats.month.cnt} />
        <BigCard label="Este año" rev={stats.year.rev} cnt={stats.year.cnt} />
      </div>

      {/* Promedios */}
      <section className="rounded-2xl border border-line bg-white p-5">
        <h3 className="mb-3 text-sm font-bold text-ink">Promedios</h3>
        <div className="grid grid-cols-2 gap-4">
          <Avg big={stats.avgSalesWeek.toFixed(1)} small="ventas / semana" />
          <Avg big={stats.avgSalesMonth.toFixed(1)} small="ventas / mes" />
          <Avg big={formatPrice(Math.round(stats.avgRevWeek))} small="por semana" />
          <Avg big={formatPrice(Math.round(stats.avgRevMonth))} small="por mes" />
        </div>
      </section>

      {/* Por año */}
      <Breakdown
        title="Por año"
        rows={stats.years.map((y) => ({
          label: String(y.y),
          sub: `${y.cnt} ${y.cnt === 1 ? "venta" : "ventas"}`,
          rev: y.rev,
        }))}
      />

      {/* Por mes */}
      <Breakdown
        title="Por mes"
        rows={stats.months.map((m) => ({
          label: `${MESES[m.m]} ${m.y}`,
          sub: `${m.cnt} ${m.cnt === 1 ? "venta" : "ventas"}`,
          rev: m.rev,
        }))}
      />

      {/* Por semana */}
      <Breakdown
        title="Por semana"
        rows={stats.weeks.map((w) => {
          const end = new Date(w.start);
          end.setDate(end.getDate() + 6);
          return {
            label: `${dm(w.start)} – ${dm(end)}`,
            sub: `${w.cnt} ${w.cnt === 1 ? "venta" : "ventas"}`,
            rev: w.rev,
          };
        })}
      />
    </div>
  );
}

function BigCard({ label, rev, cnt }: { label: string; rev: number; cnt: number }) {
  return (
    <div className="flex items-start justify-between rounded-2xl border border-line bg-white p-5">
      <div>
        <p className="font-display text-2xl font-black text-primary">{formatPrice(rev)}</p>
        <p className="mt-1 text-sm font-semibold text-ink">{label}</p>
        <p className="text-xs text-muted">{cnt} {cnt === 1 ? "venta" : "ventas"}</p>
      </div>
      <ChartIcon className="h-5 w-5 shrink-0 text-accent" />
    </div>
  );
}

function Avg({ big, small }: { big: string; small: string }) {
  return (
    <div>
      <p className="font-display text-xl font-black text-primary">{big}</p>
      <p className="text-xs text-muted">{small}</p>
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; sub: string; rev: number }[];
}) {
  if (rows.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="border-b border-line px-5 py-3">
        <h3 className="text-sm font-bold text-ink">{title}</h3>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="text-sm font-semibold capitalize text-ink">{r.label}</p>
              <p className="text-xs text-muted">{r.sub}</p>
            </div>
            <p className="font-bold text-primary">{formatPrice(r.rev)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
