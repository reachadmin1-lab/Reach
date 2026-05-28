"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api/client";
import { ChatThread } from "@/components/chat/ChatThread";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { RadarMotif } from "@/components/shared/RadarMotif";

interface Deliverable {
  id: string;
  name: string;
  status: "todo" | "in_review" | "done";
  sort_order: number;
}

interface Order {
  id: string;
  order_ref: string;
  creator_id: string;
  brand_id: string;
  amount: number;
  platform_fee: number;
  creator_payout: number;
  status: string;
  deliverables: Deliverable[];
  brief?: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending_payment:  "Pending payment",
  escrow_funded:    "Escrow funded",
  in_progress:      "In progress",
  awaiting_signoff: "Awaiting sign-off",
  delivered:        "Delivered",
  released:         "Released",
  disputed:         "Disputed",
  cancelled:        "Cancelled",
  payment_failed:   "Payment failed",
};

const STATUS_PILL: Record<string, string> = {
  escrow_funded:    "green",
  in_progress:      "brand",
  awaiting_signoff: "amber",
  released:         "green",
  disputed:         "brand",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchOrder() {
    try {
      const data = await api.get<Order>(`/orders/${id}`);
      setOrder(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchOrder(); }, [id]);

  async function cycleDeliverable(deliverable: Deliverable) {
    const next = deliverable.status === "todo" ? "in_review" : deliverable.status === "in_review" ? "done" : "todo";
    await api.patch(`/orders/${id}/deliverables?deliverable_id=${deliverable.id}&new_status=${next}`);
    fetchOrder();
  }

  async function requestSignoff() {
    await api.post(`/orders/${id}/signoff`);
    fetchOrder();
  }

  async function simulateConfirm() {
    await api.post(`/orders/${id}/confirm`);
    fetchOrder();
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!order) {
    return <div className="flex-1 flex items-center justify-center text-[var(--muted)]">Order not found</div>;
  }

  const doneCount = order.deliverables.filter((d) => d.status === "done").length;
  const totalCount = order.deliverables.length;
  const allDone = totalCount > 0 && doneCount === totalCount;
  const pillClass = STATUS_PILL[order.status] ?? "";

  return (
    <div className="flex-1 flex h-screen overflow-hidden">
      {/* Chat sidebar */}
      <ChatSidebar activeOrderId={id} />

      {/* Chat thread */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-line">
        {/* Order header */}
        <div className="px-5 py-3 border-b border-line flex items-center justify-between bg-white">
          <div>
            <p className="mono text-xs text-[var(--muted)]">{order.order_ref}</p>
            <span className={`pill ${pillClass} mt-0.5`}>{STATUS_LABELS[order.status] ?? order.status}</span>
          </div>
        </div>

        {/* Action banner */}
        {order.status === "escrow_funded" || order.status === "in_progress" ? (
          allDone ? (
            <div className="bg-[rgba(255,65,24,0.08)] border-b border-[rgba(255,65,24,0.2)] px-5 py-3 flex items-center justify-between">
              <p className="text-sm font-medium text-brand-deep">Ready to wrap?</p>
              <button type="button" onClick={requestSignoff} className="btn btn-primary btn-sm">
                Request sign-off
              </button>
            </div>
          ) : null
        ) : order.status === "awaiting_signoff" ? (
          <div className="bg-[var(--amber-soft)] border-b border-[rgba(198,138,18,0.3)] px-5 py-3 flex items-center justify-between">
            <p className="text-sm font-medium text-amber">Waiting on brand sign-off</p>
            <button type="button" onClick={simulateConfirm} className="btn btn-sm border border-amber text-amber bg-transparent">
              Simulate: client confirms
            </button>
          </div>
        ) : order.status === "released" ? (
          <div className="bg-[var(--green-soft)] border-b border-[rgba(27,156,90,0.3)] px-5 py-3">
            <p className="text-sm font-medium text-green">Payment released 🎉</p>
          </div>
        ) : null}

        <ChatThread orderId={id} />
      </div>

      {/* Right rail */}
      <div className="hidden lg:flex flex-col w-80 overflow-y-auto bg-white border-l border-line">
        {/* Escrow hero card */}
        <div className="relative bg-ink text-white overflow-hidden p-5 m-4 rounded-2xl">
          <RadarMotif />
          <div className="relative z-10">
            <p className="label-eyebrow text-[var(--muted-dark)] mb-2">Escrow</p>
            <p className="text-2xl font-bold mb-1">
              ₹{(order.creator_payout / 100).toLocaleString("en-IN")}
            </p>
            <p className="text-xs text-[var(--muted-dark)]">
              After 5% fee · Total ₹{(order.amount / 100).toLocaleString("en-IN")}
            </p>
            <div className="mt-3">
              <span className={`pill outline-dark text-[10px] h-5 px-2`}>
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
            </div>
          </div>
        </div>

        {/* Deliverables */}
        <div className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-ink">Deliverables</p>
            <span className="mono text-xs text-[var(--muted)]">{doneCount}/{totalCount}</span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-[var(--paper-2)] rounded-full mb-4 overflow-hidden">
            <div
              className="h-full bg-green rounded-full transition-all duration-500"
              style={{ width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : "0%" }}
            />
          </div>

          <div className="flex flex-col gap-2">
            {order.deliverables.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => cycleDeliverable(d)}
                className="flex items-center gap-3 p-3 rounded-xl border border-line hover:border-[var(--line-strong)] transition-colors text-left w-full"
              >
                <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-none transition-colors ${
                  d.status === "done"
                    ? "border-green bg-green"
                    : d.status === "in_review"
                    ? "border-amber bg-[var(--amber-soft)]"
                    : "border-line bg-white"
                }`}>
                  {d.status === "done" && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {d.status === "in_review" && (
                    <span className="w-2 h-2 rounded-full bg-amber block" />
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{d.name}</p>
                  <p className="text-[10px] text-[var(--muted)] capitalize">{d.status.replace("_", " ")}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Escrow timeline */}
          <div className="mt-5">
            <p className="text-xs font-semibold text-ink mb-3">Timeline</p>
            <div className="flex flex-col gap-2">
              {[
                { label: "Order created",    done: true },
                { label: "Escrow funded",    done: ["escrow_funded","in_progress","awaiting_signoff","released"].includes(order.status) },
                { label: "Work in progress", done: ["in_progress","awaiting_signoff","released"].includes(order.status) },
                { label: "Sign-off requested", done: ["awaiting_signoff","released"].includes(order.status) },
                { label: "Payment released", done: order.status === "released" },
              ].map(({ label, done }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full flex-none ${done ? "bg-green" : "bg-[var(--paper-2)] border border-line"}`} />
                  <span className={`text-xs ${done ? "text-ink" : "text-[var(--muted)]"}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
