"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepFooter } from "@/components/onboarding/StepFooter";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { api } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";

const MAX_BIO = 300;

export default function ProfileStep() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  // Wait for session and sync user to backend
  useEffect(() => {
    const supabase = createClient();

    async function initSession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // Poll for session — happens when email confirmation is disabled
        // and Supabase sets the session asynchronously
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (session) {
              await syncUser(session.access_token, session.user);
              setSessionReady(true);
              subscription.unsubscribe();
            }
          }
        );
        return;
      }
      await syncUser(data.session.access_token, data.session.user);
      setSessionReady(true);
    }

    async function syncUser(token: string, user: { email?: string; user_metadata?: Record<string, unknown> }) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: user.email ?? "",
            handle: user.user_metadata?.handle ?? "",
            role: user.user_metadata?.role ?? "creator",
            display_name: user.user_metadata?.handle ?? null,
          }),
        });
      } catch {
        // non-fatal
      }
    }

    initSession();
  }, []);

  // Auto-save on field change — only when session is confirmed
  useAutoSave(
    "/onboarding/profile",
    { display_name: displayName, bio },
    sessionReady && !!(displayName || bio)
  );

  const canContinue = displayName.trim().length > 0 && bio.trim().length > 0;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      await api.patch("/onboarding/profile", { avatar_file: "pending" });
    } finally {
      setUploading(false);
    }
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverPreview(URL.createObjectURL(file));
  }

  async function handleContinue() {
    await api.patch("/onboarding/profile", { display_name: displayName, bio });
    router.push("/onboarding/platforms");
  }

  return (
    <div className="flex flex-col flex-1">
      <StepHeader
        step={1}
        total={7}
        title="Set up your profile"
        subtitle="This is what brands will see when they visit your page."
      />

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 pb-6 flex flex-col gap-6">
        {/* Cover image */}
        <div
          className="relative h-32 rounded-2xl overflow-hidden bg-[var(--paper-2)] border border-line cursor-pointer group"
          onClick={() => coverRef.current?.click()}
        >
          {coverPreview ? (
            <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--muted)]">
                <rect x="3" y="3" width="18" height="18" rx="3"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="m21 15-5-5L5 21"/>
              </svg>
              <span className="text-xs text-[var(--muted)]">Add cover photo</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-medium">Change cover</span>
          </div>
          <input ref={coverRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleCoverChange} />
        </div>

        {/* Avatar */}
        <div className="flex items-end gap-4 -mt-10 px-4">
          <div
            className="relative w-20 h-20 rounded-full border-4 border-paper bg-[var(--paper-2)] overflow-hidden cursor-pointer flex-none group"
            onClick={() => avatarRef.current?.click()}
          >
            {avatarPreview ? (
              <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--muted)]">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
              </div>
            )}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <input ref={avatarRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleAvatarChange} />
          </div>
          <p className="text-xs text-[var(--muted)] pb-1">JPG or PNG, max 5MB</p>
        </div>

        {/* Display name */}
        <div>
          <label className="label-eyebrow block mb-1.5">Display name *</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name or brand name"
            maxLength={60}
            className="input w-full"
          />
        </div>

        {/* Bio */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label-eyebrow">Bio *</label>
            <span className={`text-xs mono ${bio.length > MAX_BIO * 0.9 ? "text-[var(--amber)]" : "text-[var(--muted)]"}`}>
              {bio.length}/{MAX_BIO}
            </span>
          </div>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
            placeholder="Tell brands what you do and who your audience is…"
            rows={4}
            className="input w-full resize-none"
          />
        </div>
      </div>

      <StepFooter
        onContinue={handleContinue}
        continueDisabled={!canContinue}
        loading={uploading}
      />
    </div>
  );
}
