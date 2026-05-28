"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";

interface Notification {
  id: string;
  kind: string;
  title: string;
  body?: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

const KIND_ICONS: Record<string, string> = {
  escrow_funded:    "💰",
  escrow_released:  "🎉",
  signoff_requested:"✅",
  new_message:      "💬",
  new_booking:      "📋",
  profile_approved: "🌟",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const unread = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    api.get<Notification[]>("/notifications").then(setNotifications).catch(() => {});

    // Subscribe to realtime notifications channel
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("broadcast", { event: "notification" }, ({ payload }) => {
        setNotifications((prev) => [payload as Notification, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleOpen() {
    setOpen((v) => !v);
    if (!open && unread > 0) {
      await api.patch("/notifications/read");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-full border border-line flex items-center justify-center hover:bg-[var(--paper-2)] transition-colors"
        aria-label="Notifications"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-brand text-white text-[9px] flex items-center justify-center font-bold">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-80 bg-white border border-line rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unread > 0 && (
              <span className="pill brand text-[10px] h-5 px-2">{unread} new</span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="text-xs text-[var(--muted)] text-center py-8">All caught up</p>
            )}
            {notifications.map((n) => (
              <Link
                key={n.id}
                href={n.link ?? "#"}
                onClick={() => setOpen(false)}
                className={`flex items-start gap-3 px-4 py-3 border-b border-line last:border-0 hover:bg-[var(--paper-2)] transition-colors ${
                  !n.is_read ? "bg-[rgba(255,65,24,0.03)]" : ""
                }`}
              >
                <span className="text-lg w-6 text-center flex-none mt-0.5">
                  {KIND_ICONS[n.kind] ?? "📌"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink leading-tight">{n.title}</p>
                  {n.body && (
                    <p className="text-xs text-[var(--muted)] mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <p className="mono text-[10px] text-[var(--muted)] mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full bg-brand flex-none mt-1.5" />
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
