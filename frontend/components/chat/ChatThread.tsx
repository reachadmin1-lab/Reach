"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  sender_id?: string;
  kind: "text" | "file" | "system";
  content?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  is_read: boolean;
  created_at: string;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isVideo(name?: string) {
  return /\.(mp4|mov|webm|avi)$/i.test(name ?? "");
}

export function ChatThread({ orderId }: { orderId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
    api.get<Message[]>(`/chat/threads/${orderId}`).then(setMessages).catch(() => {});

    const channel = supabase
      .channel(`order:${orderId}`)
      .on("broadcast", { event: "message" }, ({ payload }) => {
        setMessages((prev) => [...prev, payload as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const content = text;
    setText("");
    await api.post(`/chat/threads/${orderId}`, { content, kind: "text" });
    const updated = await api.get<Message[]>(`/chat/threads/${orderId}`);
    setMessages(updated);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const form = new FormData();
      form.append("file", file);
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      await fetch(`${API_URL}/chat/threads/${orderId}/files`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const updated = await api.get<Message[]>(`/chat/threads/${orderId}`);
      setMessages(updated);
    } catch {
      // ignore
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // Group by date
  const grouped: { date: string; messages: Message[] }[] = [];
  for (const msg of messages) {
    const date = formatDate(msg.created_at);
    const last = grouped[grouped.length - 1];
    if (last?.date === date) last.messages.push(msg);
    else grouped.push({ date, messages: [msg] });
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--paper)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-1">
        {grouped.map(({ date, messages: msgs }) => (
          <div key={date}>
            {/* Day separator */}
            <div className="flex items-center gap-3 my-4">
              <hr className="flex-1 border-line" />
              <span className="text-[10px] font-mono text-[var(--muted)] uppercase tracking-wide">{date}</span>
              <hr className="flex-1 border-line" />
            </div>

            {msgs.map((msg, idx) => {
              if (msg.kind === "system") {
                return (
                  <div key={msg.id} className="flex items-center gap-3 my-3">
                    <span className="text-[var(--brand-warm)]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                      </svg>
                    </span>
                    <p className="text-xs text-[var(--muted)] flex-1">{msg.content}</p>
                    <span className="text-[10px] text-[var(--muted)]">{formatTime(msg.created_at)}</span>
                  </div>
                );
              }

              const isMe = msg.sender_id === currentUserId;
              const prevMsg = msgs[idx - 1];
              const showSender = !isMe && (!prevMsg || prevMsg.sender_id !== msg.sender_id || prevMsg.kind === "system");
              const senderLabel = senderNames[msg.sender_id ?? ""] ?? "Client";

              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} mb-1`}>
                  {showSender && (
                    <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-wide mb-1 ml-1">
                      {senderLabel} · {formatTime(msg.created_at)}
                    </p>
                  )}
                  <div className={`max-w-[72%] ${isMe ? "" : ""}`}>
                    {msg.kind === "file" ? (
                      <div className={`rounded-2xl overflow-hidden border ${isMe ? "border-[rgba(255,255,255,0.1)] bg-ink" : "border-line bg-white"}`}>
                        {isVideo(msg.file_name) ? (
                          <div className={`flex items-center gap-3 px-4 py-3 ${isMe ? "text-white" : "text-ink"}`}>
                            <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center flex-none">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                                <polygon points="5 3 19 12 5 21 5 3"/>
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{msg.file_name}</p>
                              <p className={`text-xs ${isMe ? "text-[rgba(255,255,255,0.5)]" : "text-[var(--muted)]"}`}>
                                {formatFileSize(msg.file_size)}
                              </p>
                            </div>
                            <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                              className={`flex-none ${isMe ? "text-[rgba(255,255,255,0.6)] hover:text-white" : "text-[var(--muted)] hover:text-ink"}`}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7 10 12 15 17 10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                            </a>
                          </div>
                        ) : (
                          <a href={msg.file_url} target="_blank" rel="noopener noreferrer"
                            className={`flex items-center gap-3 px-4 py-3 ${isMe ? "text-white" : "text-ink"}`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-none">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate underline">{msg.file_name}</p>
                              <p className={`text-xs ${isMe ? "text-[rgba(255,255,255,0.5)]" : "text-[var(--muted)]"}`}>
                                {formatFileSize(msg.file_size)}
                              </p>
                            </div>
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className={`rounded-2xl px-4 py-2.5 ${
                        isMe
                          ? "bg-ink text-white rounded-br-sm"
                          : "bg-white border border-line text-ink rounded-bl-sm"
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        {(!msgs[idx + 1] || msgs[idx + 1].sender_id !== msg.sender_id) && (
                          <p className={`text-[10px] mt-1 text-right ${isMe ? "text-[rgba(255,255,255,0.4)]" : "text-[var(--muted)]"}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center py-16">
            <p className="text-xs text-[var(--muted)]">No messages yet — say hello</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Action bar */}
      <div className="border-t border-line bg-white px-4 pt-2 pb-1 flex items-center gap-2">
        <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-ink px-2 py-1.5 rounded-lg hover:bg-[var(--paper-2)] transition-colors disabled:opacity-40"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
          </svg>
          {uploading ? "Uploading…" : "Attach"}
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-ink px-2 py-1.5 rounded-lg hover:bg-[var(--paper-2)] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Mark deliverable
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-ink px-2 py-1.5 rounded-lg hover:bg-[var(--paper-2)] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4"/>
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          Request sign-off
        </button>
      </div>

      {/* Composer */}
      <form onSubmit={sendMessage} className="border-t border-line px-4 py-3 bg-white flex items-center gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Reply…`}
          className="flex-1 h-10 px-4 rounded-full border border-line bg-[var(--paper-2)] text-sm outline-none focus:border-ink transition-colors"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center disabled:opacity-40 flex-none hover:bg-[var(--brand-deep)] transition-colors"
          aria-label="Send"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </form>
    </div>
  );
}
