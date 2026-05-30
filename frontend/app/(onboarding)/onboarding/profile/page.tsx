"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepFooter } from "@/components/onboarding/StepFooter";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { api } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";

const MAX_BIO = 300;

interface ProgressResponse {
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
}

export default function ProfileStep() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);
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
              setDisplayName(String(session.user.user_metadata?.handle ?? ""));
              setHandle(String(session.user.user_metadata?.handle ?? ""));
              await syncUser(session.access_token, session.user);
              setSessionReady(true);
              subscription.unsubscribe();
            }
          }
        );
        return;
      }
      setDisplayName(String(data.session.user.user_metadata?.handle ?? ""));
      setHandle(String(data.session.user.user_metadata?.handle ?? ""));
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

  useEffect(() => {
    if (!sessionReady) return;

    async function hydrateFromBackend() {
      try {
        const progress = await api.get<ProgressResponse>("/onboarding/progress");
        const savedDisplayName = String(progress.display_name ?? "").trim();
        const savedBio = String(progress.bio ?? "");
        const savedAvatar = String(progress.avatar_url ?? "").trim();
        const savedCover = String(progress.cover_url ?? "").trim();

        if (savedDisplayName) {
          setDisplayName(savedDisplayName);
        }
        if (savedBio) {
          setBio(savedBio);
        }
        if (savedAvatar) {
          setAvatarPreview(savedAvatar);
        }
        if (savedCover) {
          setCoverPreview(savedCover);
        }
      } catch {
        // Keep local defaults when backend draft is empty/unavailable
      } finally {
        setHydrated(true);
      }
    }

    void hydrateFromBackend();
  }, [sessionReady]);

  // Auto-save on field change — only when session is confirmed
  useAutoSave(
    "/onboarding/profile",
    { display_name: displayName, handle, bio },
    sessionReady && hydrated && !!(displayName || bio || handle)
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
    await api.patch("/onboarding/profile", { display_name: displayName, handle, bio });
    router.push("/onboarding/platforms");
  }

  const handleSlug = handle.trim().toLowerCase().replace(/\s+/g, ".");
  const canShowHandleStatus = handleSlug.length > 0;

  return (
    <div className="flex flex-col flex-1">
      <StepHeader
        step={1}
        total={7}
        title="Tell brands who you are."
        subtitle="The basics: avatar, your name, a one-line bio. You can edit any of this later."
      />

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 pb-8 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-10">
        <div className="space-y-6">
          <div>
            <p className="label-eyebrow mb-2">Profile photo</p>
            <div className="border border-dashed border-line rounded-2xl p-5 bg-[var(--paper)] min-h-[238px] flex flex-col items-center justify-center">
              <button
                type="button"
                className="relative w-24 h-24 rounded-full bg-[var(--brand)] overflow-hidden mb-4 flex items-center justify-center text-white text-4xl font-semibold"
                onClick={() => avatarRef.current?.click()}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{displayName.trim().slice(0, 2).toUpperCase() || "MK"}</span>
                )}
              </button>
              <button type="button" className="btn btn-paper btn-sm" onClick={() => avatarRef.current?.click()}>
                Upload photo
              </button>
              <p className="text-[10px] tracking-[0.08em] uppercase text-[var(--muted)] mt-3">JPG PNG 400x400+</p>
              <input ref={avatarRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleAvatarChange} />
            </div>
          </div>

          <div>
            <p className="label-eyebrow mb-2">Cover image</p>
            <button
              type="button"
              className="w-full border border-dashed border-line rounded-2xl p-5 bg-[var(--paper)] min-h-[122px] flex items-center justify-center text-sm text-[var(--muted)] hover:border-[var(--line-strong)] transition-colors"
              onClick={() => coverRef.current?.click()}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Cover preview" className="w-full h-full rounded-xl object-cover min-h-[78px]" />
              ) : (
                <span>+ Add a 1500x500 cover</span>
              )}
            </button>
            <input ref={coverRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleCoverChange} />
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="label-eyebrow block mb-2">Display name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name or brand name"
              maxLength={60}
              className="input w-full"
            />
          </div>

          <div>
            <label className="label-eyebrow block mb-2">Username · @handle</label>
            <div className="input h-12 px-0 flex items-center overflow-hidden">
              <span className="px-4 text-sm text-[var(--muted)] border-r border-line">reach.app/</span>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.replace(/\s+/g, "."))}
                placeholder="maya.kapoor"
                maxLength={40}
                className="h-full flex-1 px-3 text-sm bg-transparent outline-none"
              />
              {canShowHandleStatus && (
                <span className="px-4 text-xs text-[var(--green)] mono whitespace-nowrap">✓ Yours</span>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label-eyebrow">Bio</label>
              <span className={`text-xs mono ${bio.length > MAX_BIO * 0.9 ? "text-[var(--amber)]" : "text-[var(--muted)]"}`}>
                {bio.length} / {MAX_BIO}
              </span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
              placeholder="Tell brands what you do and who your audience is..."
              rows={4}
              className="input w-full resize-none"
            />
            <p className="mt-2 text-xs text-[var(--muted)]">
              <span className="text-[var(--brand-deep)] italic mr-1">Pro tip:</span>
              Lead with what you make, not how many followers. Brands care about craft.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 h-8 rounded-full border border-line bg-white text-xs text-[var(--ink)]">
            <span aria-hidden>✦</span>
            <span>Auto-saves to your draft</span>
          </div>
        </div>
      </div>

      <StepFooter
        backHref="/signup"
        onContinue={handleContinue}
        continueDisabled={!canContinue}
        continueLabel="Continue →"
        loading={uploading}
      />
    </div>
  );
}
