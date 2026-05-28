"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { ChatThread } from "@/components/chat/ChatThread";

interface Deliverable {
  id: string;
  name: string;
  description?: string;
  status: "todo" | "in_review" | "done";
  sort_order: number;
}

interface Order {
  id: string;
  order_ref: string;
  creator_id: string;
  package_id: string;
  addons: { key: string; label: string; price: number }[];
  brief?: string;
  amount: number;
  platform_fee: number;
  creator_payout: number;
  status: string;
  deliverables: Deliverable[];
  created_at: string;
}

const STATUS_STEPS = [
  { key: "pending_payment",  label: "Order created" },
  { key: "escrow_funded",    label: "Escrow funded" },
  { key: "in_progress",      label: "In production" },
  { key: "awaiting_signoff", label: "Sign-off requested" },
  { key: "released",         label: "Escrow released" },
];

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function stepIndex(status: string) {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

export default function BrandOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [funding, setFunding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [disputing, setDisputing] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");

  async function fetchOrder() {
    try {
      const data = await api.get<Order>(`/orders/${id}`);
      setOrder(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchOrder(); }, [id]);

  async function fundEscrow() {
    setFunding(true);
    try {
      await api.post(`/orders/${id}/mock-pay`);
      fetchOrder();
    } finally {
      setFunding(false);
    }
  }

  async function confirmDelivery() {
    setConfirming(true);
    try {
      await api.post(`/orders/${id}/confirm`);
      fetchOrder();
    } finally {
      setConfirming(false);
    }
  }

  async function raiseDispute() {
    if (!disputeReason.trim()) return;
    await api.post(`/orders/${id}/dispute?reason=${encodeURIComponent(disputeReason)}`);
    setDisputing(false);
    fetchOrder();
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen text-[var(--muted)] text-sm">
        Order not found
      </div>
    );
  }

  const doneCount = order.deliverables.filter((d) => d.status === "done").length;
  const currentStep = stepIndex(order.status);
  const isReleased = order.status === "released";

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[var(--paper)]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-line px-6 py-3 flex items-center gap-4">
        <Link href="/brand/orders" className="text-[var(--muted)] hover:text-ink transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </Link>
        <p className="font-mono text-sm font-semibold text-ink flex-1">{order.order_ref}</p>
        {order.status !== "pending_payment" && order.status !== "released" && (
          <div className="flex items-center gap-2 bg-[var(--paper-2)] border border-line rounded-full px-3 py-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#1B9C5A]">
              <rect x="3" y="11" width="18" height="11" rx="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <span className="text-xs font-semibold text-ink">{fmt(order.amount)} in escrow</span>
          </div>
        )}
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] overflow-hidden">
        {/* Left: Chat */}
        <div className="flex flex-col border-r border-line overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>
          <ChatThread orderId={id} />
        </div>

        {/* Right rail */}
        <div className="overflow-y-auto p-4 flex flex-col gap-4" style={{ height: "calc(100vh - 57px)" }}>
          {/* Escrow card */}
          <div className="bg-ink text-white rounded-2xl p-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-semibold tracking-widest text-[rgba(255,255,255,0.4)] uppercase">
                {isReleased ? "Released" : "Secured in escrow"} · {order.order_ref}
              </p>
            </div>
            <p className="text-3xl font-bold mt-1">{fmt(order.amount)}</p>
            <p className="text-xs text-[rgba(255,255,255,0.4)] mt-1">
              {isReleased
                ? "Payment released to creator"
                : order.status === "pending_payment"
                ? "Fund escrow to begin work"
                : "Released automatically on client sign-off"}
            </p>

            {order.status === "pending_payment" && (
              <div className="mt-4 flex flex-col gap-2">
                <div className="bg-[rgba(255,255,255,0.06)] rounded-xl p-3 text-xs text-[rgba(255,255,255,0.5)]">
                  Chat with the creator to align on brief first. Fund escrow when you&apos;re ready to proceed.
                </div>
                <button
                  type="button"
                  onClick={fundEscrow}
                  disabled={funding}
                  className="w-full bg-brand hover:bg-[var(--brand-deep)] text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-40"
                >
                  {funding ? "Processing…" : `Fund escrow · ${fmt(order.amount)}`}
                </button>
              </div>
            )}

            {order.status === "awaiting_signoff" && (
              <div className="mt-4 flex flex-col gap-2">
                <p className="text-xs text-[rgba(255,255,255,0.5)]">
                  Creator has requested sign-off. Review deliverables and confirm.
                </p>
                <button
                  type="button"
                  onClick={confirmDelivery}
                  disabled={confirming}
                  className="w-full bg-[#1B9C5A] hover:bg-[#158a4e] text-white rounded-xl py-3 text-sm font-semibold transition-colors disabled:opacity-40"
                >
                  {confirming ? "Confirming…" : "Confirm delivery · release escrow"}
                </button>
                <button
                  type="button"
                  onClick={() => setDisputing(true)}
                  className="w-full bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.6)] rounded-xl py-2.5 text-xs font-semibold transition-colors"
                >
                  Raise a dispute
                </button>
              </div>
            )}

            {isReleased && (
              <div className="mt-3 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#1B9C5A]">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                <span className="text-xs text-[#1B9C5A] font-medium">Payment released to creator</span>
              </div>
            )}
          </div>

          {/* Deliverables */}
          <div className="bg-white rounded-2xl border border-line p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase">
                Deliverables · {doneCount} of {order.deliverables.length}
              </p>
              <span className="text-[10px] text-[var(--muted)]">
                {order.deliverables.length > 0
                  ? Math.round((doneCount / order.deliverables.length) * 100)
                  : 0}%
              </span>
            </div>
            <div className="h-1 bg-[var(--paper-2)] rounded-full mb-4 overflow-hidden">
              <div
                className="h-full bg-[#1B9C5A] rounded-full transition-all"
                style={{
                  width: order.deliverables.length > 0
                    ? `${(doneCount / order.deliverables.length) * 100}%`
                    : "0%",
                }}
              />
            </div>
            <div className="flex flex-col gap-2">
              {order.deliverables.length === 0 && (
                <p className="text-xs text-[var(--muted)] text-center py-2">No deliverables defined</p>
              )}
              {order.deliverables.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-line">
                  <div className={`w-5 h-5 rounded flex items-center justify-center flex-none ${
                    d.status === "done"
                      ? "bg-[#1B9C5A]"
                      : d.status === "in_review"
                      ? "bg-brand"
                      : "bg-[var(--paper-2)] border border-line"
                  }`}>
                    {d.status === "done" && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    )}
                    {d.status === "in_review" && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-sm text-ink flex-1">{d.name}</span>
                  {d.status === "in_review" && (
                    <span className="text-[9px] font-bold text-brand border border-brand rounded px-1 uppercase tracking-wide">
                      For review
                    </span>
                  )}
                  {d.status === "done" && (
                    <span className="text-[9px] font-bold text-[#1B9C5A] border border-[#1B9C5A] rounded px-1 uppercase tracking-wide">
                      Done
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Escrow timeline */}
          <div className="bg-white rounded-2xl border border-line p-5">
            <p className="text-[10px] font-semibold text-[var(--muted)] tracking-widest uppercase mb-4">
              Escrow Timeline
            </p>
            <div className="flex flex-col">
              {STATUS_STEPS.map((step, i) => {
                const done = i < currentStep;
                const active = i === currentStep;
                const future = i > currentStep;
                return (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-none ${
                        done ? "bg-ink" : active ? "bg-brand" : "bg-[var(--paper-2)] border border-line"
                      }`}>
                        {done && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <path d="M20 6L9 17l-5-5"/>
                          </svg>
                        )}
                        {active && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div
                          className={`w-px my-1 ${done ? "bg-ink" : "bg-[var(--paper-2)]"}`}
                          style={{ minHeight: "20px" }}
                        />
                      )}
                    </div>
                    <div className="pb-4 flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-tight ${future ? "text-[var(--muted)]" : "text-ink"}`}>
                        {step.label}
                      </p>
                      {step.key === "pending_payment" && order.addons?.length > 0 && (
                        <p className="text-xs text-[var(--muted)] mt-0.5">
                          {order.addons.map((a) => a.label).join(" + ")}
                        </p>
                      )}
                      {step.key === "escrow_funded" && done && (
                        <p className="text-xs text-[var(--muted)] mt-0.5">{fmt(order.amount)} in trust</p>
                      )}
                      {step.key === "awaiting_signoff" && future && (
                        <p className="text-xs text-[var(--muted)] mt-0.5">Awaiting client confirm</p>
                      )}
                      {step.key === "released" && done && (
                        <p className="text-xs text-[var(--muted)] mt-0.5">Instant payout to creator</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-[var(--muted)] mt-1">
              Something off? <a href="mailto:support@reach.app" className="underline">Raise a dispute</a>
            </p>
          </div>

          {/* Dispute form */}
          {disputing && (
            <div className="bg-white rounded-2xl border border-line p-5 flex flex-col gap-3">
              <p className="text-sm font-semibold text-ink">Raise a dispute</p>
              <p className="text-xs text-[var(--muted)]">
                Escrow will be frozen pending resolution. Describe the issue clearly.
              </p>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Describe the issue…"
                rows={3}
                className="w-full border border-line rounded-xl px-3 py-2 text-sm outline-none focus:border-ink resize-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={raiseDispute}
                  className="flex-1 bg-brand text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-[var(--brand-deep)] transition-colors"
                >
                  Submit dispute
                </button>
                <button
                  type="button"
                  onClick={() => setDisputing(false)}
                  className="px-4 bg-[var(--paper-2)] text-ink rounded-xl py-2.5 text-sm font-semibold hover:bg-[var(--line)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {order.status === "disputed" && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-sm font-semibold text-red-700">Dispute raised</p>
              <p className="text-xs text-red-600 mt-1">Escrow is frozen. Our team will review and resolve.</p>
              <p className="text-xs text-[var(--muted)] mt-2">
                <a href="mailto:support@reach.app" className="underline">Contact support</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
