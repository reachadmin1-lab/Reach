"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";

interface Thread {
  order_id: string;
  order_ref: string;
  other_party_name: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
}

export function ChatSidebar({ activeOrderId }: { activeOrderId: string }) {
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    api.get<Thread[]>("/chat/threads").then(setThreads).catch(() => {});
  }, []);

  return (
    <div className="hidden md:flex flex-col w-64 border-r border-line bg-white overflow-y-auto">
      <div className="px-4 py-3 border-b border-line">
        <p className="text-sm font-semibold text-ink">Messages</p>
        <input
          type="text"
          placeholder="Search…"
          className="input h-8 text-xs mt-2"
        />
      </div>

      <div className="flex-1">
        {threads.length === 0 ? (
          <p className="text-xs text-[var(--muted)] text-center py-8">No active threads</p>
        ) : (
          threads.map((t) => (
            <Link
              key={t.order_id}
              href={`/dashboard/orders/${t.order_id}`}
              className={`flex items-start gap-3 px-4 py-3 border-b border-line hover:bg-[var(--paper-2)] transition-colors ${
                t.order_id === activeOrderId ? "border-l-2 border-l-brand bg-[rgba(255,65,24,0.04)]" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-[var(--paper-2)] flex items-center justify-center flex-none text-sm font-semibold text-ink">
                {t.other_party_name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-ink truncate">{t.other_party_name}</p>
                  {t.unread_count > 0 && (
                    <span className="w-5 h-5 rounded-full bg-brand text-white text-[10px] flex items-center justify-center flex-none ml-1">
                      {t.unread_count}
                    </span>
                  )}
                </div>
                <p className="mono text-[10px] text-[var(--muted)]">{t.order_ref}</p>
                {t.last_message && (
                  <p className="text-xs text-[var(--muted)] truncate mt-0.5">{t.last_message}</p>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
