"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import { ChatThread } from "@/components/chat/ChatThread";

interface Thread {
  order_id: string;
  order_ref: string;
  other_party_name: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  order_status?: string;
  amount?: number;
}

function timeAgo(iso?: string) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function fmt(paise?: number) {
  if (!paise) return "";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><div className="w-5 h-5 border-2 border-line border-t-brand rounded-full animate-spin" /></div>}>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const activeId = searchParams.get("order") ?? "";

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { window.location.href = "/login"; return; }
      api.get<Thread[]>("/chat/threads")
        .then(setThreads)
        .catch(() => {})
        .finally(() => setLoading(false));
    });
  }, []);

  const filtered = threads.filter((t) =>
    t.other_party_name.toLowerCase().includes(search.toLowerCase()) ||
    t.order_ref.toLowerCase().includes(search.toLowerCase())
  );

  const activeThread = threads.find((t) => t.order_id === activeId);

  return (
    <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 0px)" }}>
      {/* Thread list sidebar */}
      <div className={`flex flex-col border-r border-line bg-white ${activeId ? "hidden md:flex" : "flex"} w-full md:w-72 flex-none`}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-line">
          <p className="text-[10px] font-bold tracking-widest text-[var(--muted)] uppercase mb-3">Messages</p>
          <div className="flex items-center gap-2 h-9 px-3 rounded-full border border-line bg-[var(--paper-2)]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[var(--muted)] flex-none">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="flex-1 bg-transparent text-xs outline-none text-ink placeholder:text-[var(--muted)]"
            />
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-5 h-5 border-2 border-line border-t-brand rounded-full animate-spin" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 px-4">
              <p className="text-sm font-medium text-ink">No conversations yet</p>
              <p className="text-xs text-[var(--muted)] mt-1">Threads appear here once a brand books you</p>
            </div>
          )}
          {filtered.map((t) => {
            const isActive = t.order_id === activeId;
            return (
              <button
                key={t.order_id}
                type="button"
                onClick={() => router.push(`/dashboard/chat?order=${t.order_id}`)}
                className={`w-full flex items-start gap-3 px-4 py-3.5 border-b border-line text-left transition-colors ${
                  isActive
                    ? "bg-[rgba(255,65,24,0.04)] border-l-2 border-l-brand"
                    : "hover:bg-[var(--paper-2)]"
                }`}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-[var(--paper-2)] border border-line flex items-center justify-center flex-none text-xs font-bold text-ink">
                  {initials(t.other_party_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-sm font-semibold text-ink truncate">{t.other_party_name}</p>
                    <span className="text-[10px] text-[var(--muted)] flex-none">{timeAgo(t.last_message_at)}</span>
                  </div>
                  <p className="text-[10px] font-mono text-[var(--muted)] mt-0.5">{t.order_ref}</p>
                  {t.last_message && (
                    <p className="text-xs text-[var(--muted)] truncate mt-0.5">{t.last_message}</p>
                  )}
                </div>
                {t.unread_count > 0 && (
                  <span className="w-5 h-5 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center flex-none mt-0.5">
                    {t.unread_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chat area */}
      {activeId ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Thread header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-line bg-white">
            {/* Back on mobile */}
            <button
              type="button"
              onClick={() => router.push("/dashboard/chat")}
              className="md:hidden text-[var(--muted)] hover:text-ink"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l-7 7 7 7"/>
              </svg>
            </button>
            {activeThread && (
              <>
                <div className="w-9 h-9 rounded-full bg-[var(--paper-2)] border border-line flex items-center justify-center text-xs font-bold text-ink flex-none">
                  {initials(activeThread.other_party_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink">{activeThread.other_party_name}</p>
                  <p className="text-[10px] font-mono text-[var(--muted)]">
                    {activeThread.order_ref}
                    {activeThread.amount ? ` · ${fmt(activeThread.amount)} in escrow` : ""}
                  </p>
                </div>
                <a
                  href={`/dashboard/orders/${activeThread.order_id}`}
                  className="text-xs font-semibold text-brand hover:underline flex-none"
                >
                  View order →
                </a>
              </>
            )}
          </div>

          {/* Messages */}
          <ChatThread orderId={activeId} />
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-[var(--paper)]">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--paper-2)] border border-line flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-[var(--muted)]">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="text-sm font-medium text-ink">Select a conversation</p>
            <p className="text-xs text-[var(--muted)] mt-1">Pick a thread from the left to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
}
