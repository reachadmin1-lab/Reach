"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";

interface BrandDashboard {
  active_campaigns: number;
  pending_signoffs: number;
  total_spend: number;
  recent_orders: {
    id: string;
    order_ref: string;
    status: string;
    amount: number;
    created_at: string;
  }[];
}

const STATUS_CONFIG: Record<string, { dot: string; label: string; pill: string }> = {
  pending_payment:  { dot: "bg-amber-400",  label: "Pending payment", pill: "text-amber-700 bg-amber-50" },
  escrow_funded:    { dot: "bg-[#1B9C5A]",  label: "In escrow",       pill: "text-[#1B9C5A] bg-[rgba(27,156,90,0.1)]" },
  in_progress:      { dot: "bg-brand",      label: "In progress",     pill: "text-brand bg-[rgba(255,65,24,0.1)]" },
  awaiting_signoff: { dot: "bg-amber-500",  label: "Awaiting sign-off", pill: "text-amber-700 bg-amber-50" },
  released:         { dot: "bg-[#1B9C5A]",  label: "Released",        pill: "text-[#1B9C5A] bg-[rgba(27,156,90,0.1)]" },
  disputed:         { dot: "bg-red-500",    label: "Disputed",        pill: "text-red-700 bg-red-50" },
};

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

export default function BrandDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<BrandDashboard | null>(null);
  const [handle, setHandle] = useState("");
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [filter, setFilter] = useState("All");
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: s }) => {
      if (!s.session) { window.location.href = "/login"; return; }
      const h = s.session.user?.user_metadata?.handle;
      if (h) setHandle(h);
      api.get<BrandDashboard>("/brand/dashboard").then(setData).catch(() => {});
    });
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setAvatarOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now
    .toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .toUpperCase();

  const initials = handle.slice(0, 2).toUpperCase() || "?";

  const orders = data?.recent_orders ?? [];
  const filtered = orders.filter((o) => {
    if (filter === "All") return true;
    if (filter === "Active") return ["escrow_funded", "in_progress"].includes(o.status);
    if (filter === "Sign-off") return o.status === "awaiting_signoff";
    if (filter === "Done") return o.status === "released";
    return true;
  });

  const needsSignoff = orders.filter((o) => o.status === "awaiting_signoff").length;

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[var(--paper)]">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white border-b border-line px-6 py-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-[var(--muted)] tracking-widest font-medium">{dateStr}</p>
          <h1 className="text-xl font-bold text-ink leading-tight mt-0.5">
            {greeting}, <span className="serif italic text-[var(--brand-warm)]">{handle || "there"}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Search pill */}
          <div className="hidden md:flex items-center gap-2 h-9 px-4 rounded-full border border-line bg-white text-[var(--muted)] min-w-[180px]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <span className="text-xs">Search orders…</span>
          </div>
          {/* Avatar */}
          <div ref={avatarRef} className="relative z-50">
            <button
              type="button"
              onClick={() => setAvatarOpen((v) => !v)}
              className="w-9 h-9 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm hover:opacity-90 transition-opacity"
            >
              {initials}
            </button>
            {avatarOpen && (
              <div className="absolute right-0 top-11 w-52 bg-white border border-line rounded-2xl shadow-2xl overflow-hidden py-1">
                <div className="px-4 py-3 border-b border-line">
                  <p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Signed in as</p>
                  <p className="text-sm font-semibold text-ink truncate mt-0.5">@{handle}</p>
                </div>
                <Link href="/brand/settings" onClick={() => setAvatarOpen(false)}
                  className="flex items-center px-4 py-2.5 text-sm text-ink hover:bg-[var(--paper-2)] transition-colors">
                  Settings
                </Link>
                <Link href="/dashboard" onClick={() => setAvatarOpen(false)}
                  className="flex items-center px-4 py-2.5 text-sm text-ink hover:bg-[var(--paper-2)] transition-colors">
                  Switch to creator view
                </Link>
                <hr className="border-line my-1" />
                <button type="button" onClick={handleLogout}
                  className="flex items-center px-4 py-2.5 text-sm text-brand hover:bg-[var(--paper-2)] transition-colors w-full text-left">
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 flex flex-col gap-5 pb-20 md:pb-6">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "ACTIVE ORDERS",
              value: data?.active_campaigns ?? "—",
              sub: data?.active_campaigns ? `${data.active_campaigns} in progress` : "no active orders",
            },
            {
              label: "PENDING SIGN-OFFS",
              value: data?.pending_signoffs ?? "—",
              sub: needsSignoff > 0 ? "Action required" : "all clear",
              urgent: needsSignoff > 0,
            },
            {
              label: "TOTAL SPEND",
              value: data ? fmt(data.total_spend) : "—",
              sub: "across all orders",
            },
          ].map(({ label, value, sub, urgent }) => (
            <div key={label} className={`bg-white rounded-2xl border p-5 ${urgent ? "border-amber-200" : "border-line"}`}>
              <p className="text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase mb-3">{label}</p>
              <p className={`text-4xl font-bold leading-none ${urgent ? "text-amber-600" : "text-ink"}`}>{value}</p>
              <p className={`text-xs mt-2 ${urgent ? "text-amber-600 font-medium" : "text-[var(--muted)]"}`}>{sub}</p>
            </div>
          ))}
        </div>

        {/* Sign-off alert */}
        {needsSignoff > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-none">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-600">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {needsSignoff} order{needsSignoff > 1 ? "s" : ""} awaiting your sign-off
                </p>
                <p className="text-xs text-amber-600 mt-0.5">Review deliverables and confirm to release escrow</p>
              </div>
            </div>
            <Link href="/brand/orders?filter=signoff"
              className="text-xs font-semibold text-amber-800 bg-amber-100 hover:bg-amber-200 px-4 py-2 rounded-lg transition-colors flex-none">
              Review now
            </Link>
          </div>
        )}

        {/* Orders table */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase">Recent Orders</p>
            <div className="flex items-center gap-1 bg-[var(--paper-2)] rounded-full p-1">
              {["All", "Active", "Sign-off", "Done"].map((f) => (
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
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase hidden lg:table-cell">Timeline</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-[var(--muted)] text-xs">
                      No orders yet — share a creator&apos;s booking link to get started
                    </td>
                  </tr>
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
                            {needsAction ? "Sign off" : "Pay"}
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
    </div>
  );
}
