"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import { NotificationBell } from "@/components/shared/NotificationBell";

interface DashboardStats {
  active_orders: number;
  pending_requests: number;
  profile_views_7d: number;
  lifetime_earnings: number;
  available_balance: number;
  escrow_balance: number;
  month_gross: number;
  earnings_chart: { month: string; amount: number }[];
  activity: {
    id: string;
    kind: string;
    title: string;
    body?: string;
    link?: string;
    is_read: boolean;
    created_at: string;
  }[];
}

interface Order {
  id: string;
  order_ref: string;
  status: string;
  amount: number;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { dot: string; label: string; pill: string }> = {
  escrow_funded:    { dot: "bg-[#1B9C5A]", label: "In escrow",   pill: "text-[#1B9C5A] bg-[rgba(27,156,90,0.1)]" },
  in_progress:      { dot: "bg-brand",      label: "In progress", pill: "text-brand bg-[rgba(255,65,24,0.1)]" },
  awaiting_signoff: { dot: "bg-amber-500",  label: "Awaiting",    pill: "text-amber-700 bg-amber-50" },
  released:         { dot: "bg-[#1B9C5A]",  label: "Released",    pill: "text-[#1B9C5A] bg-[rgba(27,156,90,0.1)]" },
  pending_payment:  { dot: "bg-amber-400",  label: "Pending",     pill: "text-amber-700 bg-amber-50" },
  disputed:         { dot: "bg-red-500",    label: "Disputed",    pill: "text-red-700 bg-red-50" },
};

function ActivityIcon({ kind }: { kind: string }) {
  const cls = "w-3.5 h-3.5";
  if (kind === "escrow_funded")
    return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>;
  if (kind === "escrow_released" || kind === "signoff_requested")
    return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>;
  if (kind === "new_message")
    return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
  if (kind === "new_booking")
    return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>;
  return <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>;
}

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [handle, setHandle] = useState("");
  const [userId, setUserId] = useState("");
  const [copied, setCopied] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [filter, setFilter] = useState("All");
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = "/login"; return; }
      api.get<DashboardStats>("/dashboard/stats").then(setStats).catch(() => {});
      api.get<Order[]>("/orders").then(setOrders).catch(() => {});
      const h = data.session.user?.user_metadata?.handle;
      if (h) setHandle(h);
      setUserId(data.session.user.id);
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

  async function copyBookingLink() {
    await navigator.clipboard.writeText(`https://reach.app/@${handle}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toUpperCase();

  const chartData = stats?.earnings_chart ?? [];
  const maxVal = Math.max(...chartData.map((d) => d.amount), 1);
  const W = 260, H = 60;
  const pts = chartData.map((d, i) => ({
    x: chartData.length > 1 ? (i / (chartData.length - 1)) * W : 0,
    y: H - 8 - (d.amount / maxVal) * (H - 16),
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = pts.length > 1 ? `${linePath} L${W},${H} L0,${H} Z` : "";

  const filteredOrders = orders.filter((o) => {
    if (filter === "All") return true;
    if (filter === "Active") return ["escrow_funded", "in_progress", "awaiting_signoff"].includes(o.status);
    if (filter === "Delivered") return o.status === "released";
    if (filter === "Pending") return o.status === "pending_payment";
    return true;
  });

  const initials = handle.slice(0, 2).toUpperCase() || "?";

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[var(--paper)]">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white border-b border-line px-6 py-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-[var(--muted)] tracking-widest font-medium">{dateStr}</p>
          <h1 className="text-xl font-bold text-ink leading-tight mt-0.5">
            {greeting}, <span className="serif italic text-[var(--brand-warm)]">{handle || "creator"}</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Search pill */}
          <div className="hidden md:flex items-center gap-2 h-9 px-4 rounded-full border border-line bg-white text-[var(--muted)] min-w-[180px]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <span className="text-xs">Search orders, clients…</span>
          </div>
          {/* Bell */}
          {userId && <NotificationBell userId={userId} />}
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
                {[
                  { href: "/dashboard/profile", label: "Public profile" },
                  { href: "/onboarding/packages", label: "Edit packages" },
                  { href: "/dashboard/earnings", label: "Earnings" },
                  { href: "/dashboard/settings", label: "Settings" },
                ].map((item) => (
                  <Link key={item.href} href={item.href} onClick={() => setAvatarOpen(false)}
                    className="flex items-center px-4 py-2.5 text-sm text-ink hover:bg-[var(--paper-2)] transition-colors">
                    {item.label}
                  </Link>
                ))}
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
        {/* Row 1: Stats + Earnings */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
          <div className="flex flex-col gap-4">
            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "ACTIVE ORDERS",     value: stats?.active_orders ?? "—",     sub: stats?.active_orders ? `${stats.active_orders} due this week` : "none in progress" },
                { label: "PENDING REQUESTS",  value: stats?.pending_requests ?? "—",  sub: stats?.pending_requests ? "Oldest 9:14am today" : "awaiting payment" },
                { label: "PROFILE VIEWS · 7D", value: stats?.profile_views_7d ?? "—", sub: "↑ 18% from last week" },
              ].map(({ label, value, sub }) => (
                <div key={label} className="bg-white rounded-2xl border border-line p-5">
                  <p className="text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase mb-3">{label}</p>
                  <p className="text-4xl font-bold text-ink leading-none">{value}</p>
                  <p className="text-xs text-[var(--muted)] mt-2">{sub}</p>
                </div>
              ))}
            </div>

            {/* Quick action cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
                  label: "Copy booking link",
                  sub: copied ? "Copied!" : `reach.app/@${handle}`,
                  onClick: copyBookingLink,
                },
                {
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
                  label: "Edit packages",
                  sub: "3 tiers · 4 add-ons",
                  href: "/onboarding/packages",
                },
                {
                  icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
                  label: "Cash out balance",
                  sub: fmt(stats?.available_balance ?? 0),
                  href: "/dashboard/earnings",
                },
              ].map(({ icon, label, sub, onClick, href }: { icon: React.ReactNode; label: string; sub: string; onClick?: () => void; href?: string }) => {
                const inner = (
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <span className="text-[var(--muted)]">{icon}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--muted)]">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-ink">{label}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5 truncate">{sub}</p>
                  </>
                );
                const cls = "bg-white rounded-2xl border border-line p-4 text-left hover:border-[var(--line-strong)] hover:shadow-sm transition-all";
                return href ? (
                  <Link key={label} href={href} className={cls}>{inner}</Link>
                ) : (
                  <button key={label} type="button" onClick={onClick} className={cls}>{inner}</button>
                );
              })}
            </div>
          </div>

          {/* Earnings panel */}
          <div className="bg-ink text-white rounded-2xl p-5 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold tracking-widest text-[rgba(255,255,255,0.4)] uppercase">Lifetime Earnings · Ledger</p>
              <span className="text-[10px] font-semibold text-green-400 flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 15l-6-6-6 6"/></svg>
                +24% YoY
              </span>
            </div>
            <p className="text-3xl font-bold mt-2 leading-none">{fmt(stats?.lifetime_earnings ?? 0)}</p>
            <div className="flex gap-6 mt-4">
              <div>
                <p className="text-[10px] text-[rgba(255,255,255,0.4)] uppercase tracking-wide">Available</p>
                <p className="text-base font-bold text-green-400 mt-0.5">{fmt(stats?.available_balance ?? 0)}</p>
              </div>
              <div>
                <p className="text-[10px] text-[rgba(255,255,255,0.4)] uppercase tracking-wide">In escrow</p>
                <p className="text-base font-bold text-amber-400 mt-0.5">{fmt(stats?.escrow_balance ?? 0)}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-[10px] text-[rgba(255,255,255,0.4)] uppercase tracking-wide">This month</p>
              <p className="text-2xl font-bold mt-0.5">{fmt(stats?.month_gross ?? 0)}</p>
            </div>
            <div className="mt-4 flex-1 min-h-[64px]">
              {pts.length > 1 ? (
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FF4118" stopOpacity="0.5"/>
                      <stop offset="100%" stopColor="#FF4118" stopOpacity="0.05"/>
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#ag)"/>
                  <path d={linePath} fill="none" stroke="#FF4118" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-[rgba(255,255,255,0.3)]">No chart data yet</p>
                </div>
              )}
            </div>
            <button type="button" className="mt-4 w-full bg-brand hover:bg-[var(--brand-deep)] text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Cash out {fmt(stats?.available_balance ?? 0)}
            </button>
          </div>
        </div>

        {/* Row 2: Activity + Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          {/* Activity */}
          <div className="bg-white rounded-2xl border border-line p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase">Activity</p>
              <span className="text-[10px] text-[var(--muted)]">Last 24h</span>
            </div>
            <div className="flex flex-col">
              {(stats?.activity ?? []).length === 0 && (
                <p className="text-xs text-[var(--muted)] py-6 text-center">No recent activity</p>
              )}
              {(stats?.activity ?? []).map((item) => (
                <Link key={item.id} href={item.link ?? "#"}
                  className="flex items-start gap-3 py-3 border-b border-line last:border-0 hover:bg-[var(--paper-2)] -mx-2 px-2 rounded-lg transition-colors">
                  <div className="w-7 h-7 rounded-full bg-[var(--paper-2)] border border-line flex items-center justify-center flex-none text-[var(--muted)] mt-0.5">
                    <ActivityIcon kind={item.kind} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink leading-tight">{item.title}</p>
                    {item.body && <p className="text-xs text-[var(--muted)] mt-0.5 truncate">{item.body}</p>}
                  </div>
                  <span className="text-[10px] text-[var(--muted)] flex-none mt-0.5 whitespace-nowrap">{timeAgo(item.created_at)}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Orders */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase">Recent Orders</p>
              <div className="flex items-center gap-1 bg-[var(--paper-2)] rounded-full p-1">
                {["All", "Active", "Delivered", "Pending"].map((f) => (
                  <button key={f} type="button" onClick={() => setFilter(f)}
                    className={`text-xs px-3 py-1 rounded-full transition-all font-medium ${filter === f ? "bg-ink text-white shadow-sm" : "text-[var(--muted)] hover:text-ink"}`}>
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
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase hidden lg:table-cell">Package</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase">Amount</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase hidden lg:table-cell">Timeline</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-[var(--muted)] text-xs">No orders yet</td></tr>
                  )}
                  {filteredOrders.slice(0, 8).map((order) => {
                    const cfg = STATUS_CONFIG[order.status] ?? { dot: "bg-slate-300", label: order.status, pill: "text-slate-500 bg-slate-50" };
                    const isActive = ["escrow_funded", "in_progress", "awaiting_signoff"].includes(order.status);
                    const daysAgo = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 86400000);
                    return (
                      <tr key={order.id} className="border-b border-line last:border-0 hover:bg-[var(--paper-2)] transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-mono text-xs font-semibold text-ink">{order.order_ref}</p>
                          {isActive && <span className="inline-block mt-1 text-[9px] font-bold text-brand border border-brand rounded px-1 uppercase tracking-wide">Open</span>}
                        </td>
                        <td className="px-4 py-3.5 hidden lg:table-cell"><p className="text-xs text-[var(--muted)]">—</p></td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.pill}`}>
                            <span className={`w-1.5 h-1.5 rounded-full flex-none ${cfg.dot}`} />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-ink text-sm">{fmt(order.amount)}</td>
                        <td className="px-4 py-3.5 hidden lg:table-cell"><p className="text-xs text-[var(--muted)]">{daysAgo === 0 ? "today" : `${daysAgo}d ago`}</p></td>
                        <td className="px-4 py-3.5 text-right">
                          <Link href={`/dashboard/orders/${order.id}`}
                            className={`text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${isActive ? "bg-brand text-white hover:bg-[var(--brand-deep)]" : "text-[var(--muted)] hover:text-ink"}`}>
                            {isActive ? "Open" : "View"}
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
    </div>
  );
}
