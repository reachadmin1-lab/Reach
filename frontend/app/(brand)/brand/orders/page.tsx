"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";

interface Order {
  id: string;
  order_ref: string;
  status: string;
  amount: number;
  created_at: string;
  brief?: string;
}

const STATUS_CONFIG: Record<string, { dot: string; label: string; pill: string }> = {
  pending_payment:  { dot: "bg-amber-400",  label: "Pending payment",  pill: "text-amber-700 bg-amber-50" },
  escrow_funded:    { dot: "bg-[#1B9C5A]",  label: "In escrow",        pill: "text-[#1B9C5A] bg-[rgba(27,156,90,0.1)]" },
  in_progress:      { dot: "bg-brand",      label: "In progress",      pill: "text-brand bg-[rgba(255,65,24,0.1)]" },
  awaiting_signoff: { dot: "bg-amber-500",  label: "Awaiting sign-off", pill: "text-amber-700 bg-amber-50" },
  released:         { dot: "bg-[#1B9C5A]",  label: "Released",         pill: "text-[#1B9C5A] bg-[rgba(27,156,90,0.1)]" },
  disputed:         { dot: "bg-red-500",    label: "Disputed",         pill: "text-red-700 bg-red-50" },
  cancelled:        { dot: "bg-slate-300",  label: "Cancelled",        pill: "text-slate-500 bg-slate-50" },
};

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

const FILTERS = ["All", "Active", "Sign-off", "Done", "Pending"];

export default function BrandOrdersPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-5 h-5 border-2 border-line border-t-brand rounded-full animate-spin" /></div>}>
      <BrandOrdersPageInner />
    </Suspense>
  );
}

function BrandOrdersPageInner() {
  const searchParams = useSearchParams();
  const defaultFilter = searchParams.get("filter") === "signoff" ? "Sign-off" : "All";
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(defaultFilter);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = "/login"; return; }
      api.get<Order[]>("/orders")
        .then(setOrders)
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, []);

  const filtered = orders.filter((o) => {
    if (filter === "All") return true;
    if (filter === "Active") return ["escrow_funded", "in_progress"].includes(o.status);
    if (filter === "Sign-off") return o.status === "awaiting_signoff";
    if (filter === "Done") return o.status === "released";
    if (filter === "Pending") return o.status === "pending_payment";
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[var(--paper)]">
      <header className="sticky top-0 z-20 bg-white border-b border-line px-6 py-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-[var(--muted)] tracking-widest font-medium uppercase">Brand</p>
          <h1 className="text-xl font-bold text-ink leading-tight mt-0.5">Orders</h1>
        </div>
      </header>

      <div className="flex-1 p-6 flex flex-col gap-4 pb-20 md:pb-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-[var(--muted)]">{orders.length} total order{orders.length !== 1 ? "s" : ""}</p>
          <div className="flex items-center gap-1 bg-[var(--paper-2)] rounded-full p-1">
            {FILTERS.map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1 rounded-full transition-all font-medium ${
                  filter === f ? "bg-ink text-white shadow-sm" : "text-[var(--muted)] hover:text-ink"
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase">Order</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase hidden lg:table-cell">Creator</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase">Status</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase">Amount</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase hidden lg:table-cell">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} className="text-center py-10">
                  <div className="w-5 h-5 border-2 border-line border-t-brand rounded-full animate-spin mx-auto" />
                </td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-[var(--muted)] text-xs">
                  No orders in this category
                </td></tr>
              )}
              {filtered.map((order) => {
                const cfg = STATUS_CONFIG[order.status] ?? { dot: "bg-slate-300", label: order.status, pill: "text-slate-500 bg-slate-50" };
                const needsAction = order.status === "awaiting_signoff";
                const isPending = order.status === "pending_payment";
                return (
                  <tr key={order.id} className="border-b border-line last:border-0 hover:bg-[var(--paper-2)] transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="font-mono text-xs font-semibold text-ink">{order.order_ref}</p>
                      {(needsAction || isPending) && (
                        <span className={`inline-block mt-1 text-[9px] font-bold border rounded px-1 uppercase tracking-wide ${
                          needsAction ? "text-amber-600 border-amber-400" : "text-brand border-brand"
                        }`}>
                          {needsAction ? "Sign off" : "Fund escrow"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <p className="text-xs text-[var(--muted)]">—</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.pill}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-none ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-ink text-sm">{fmt(order.amount)}</td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <p className="text-xs text-[var(--muted)]">{timeAgo(order.created_at)}</p>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link href={`/brand/orders/${order.id}`}
                        className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${
                          needsAction
                            ? "bg-amber-500 text-white hover:bg-amber-600"
                            : isPending
                            ? "bg-brand text-white hover:bg-[var(--brand-deep)]"
                            : "text-[var(--muted)] hover:text-ink"
                        }`}>
                        {needsAction ? "Sign off" : isPending ? "Fund" : "View"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
