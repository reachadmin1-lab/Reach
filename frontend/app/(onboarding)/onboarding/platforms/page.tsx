"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepFooter } from "@/components/onboarding/StepFooter";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { api } from "@/lib/api/client";

const PLATFORMS = [
  { key: "instagram", label: "Instagram", hint: "@handle", sub: "Most booked", icon: "◎", dark: true },
  { key: "youtube", label: "YouTube", hint: "your channel", sub: "Long-form", icon: "▣", dark: true },
  { key: "tiktok", label: "TikTok", hint: "@handle", sub: "Short-form", icon: "♪" },
  { key: "x", label: "X · Twitter", hint: "@handle", sub: "Optional", icon: "⊕" },
  { key: "linkedin", label: "LinkedIn", hint: "profile URL", sub: "B2B audience", icon: "⊕" },
];

export default function PlatformsStep() {
  const router = useRouter();
  const [handles, setHandles] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function hydrateFromBackend() {
      try {
        const progress = await api.get<{ platforms: Record<string, string> | null }>("/onboarding/progress");
        setHandles(progress.platforms ?? {});
      } catch {
        setHandles({});
      } finally {
        setHydrated(true);
      }
    }

    void hydrateFromBackend();
  }, []);

  useAutoSave("/onboarding/platforms", { platforms: handles }, hydrated);

  const filledCount = Object.values(handles).filter((v) => v.trim()).length;
  const canContinue = filledCount >= 1;

  function setHandle(key: string, value: string) {
    setHandles((prev) => ({ ...prev, [key]: value }));
  }

  async function handleContinue() {
    await api.patch("/onboarding/platforms", { platforms: handles });
    router.push("/onboarding/languages");
  }

  return (
    <div className="flex flex-col flex-1">
      <StepHeader
        step={2}
        total={7}
        title={
          <>
            Where do you <span className="serif text-brand">publish?</span>
          </>
        }
        subtitle="Link the platforms you create on. Brands use these to verify reach and match relevance."
      />

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 pb-6 flex flex-col gap-3">
        {PLATFORMS.map((p) => (
          <div key={p.key} className="bg-white border border-line rounded-2xl px-4 py-3.5 flex items-center gap-4">
            <span
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-none ${
                p.dark ? "bg-ink text-white" : "bg-[var(--paper-2)] text-ink"
              }`}
            >
              {p.icon}
            </span>

            <div className="w-[124px] flex-none">
              <p className="text-base font-medium text-ink">{p.label}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{p.sub}</p>
            </div>

            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={handles[p.key] ?? ""}
                onChange={(e) => setHandle(p.key, e.target.value)}
                placeholder={p.hint}
                className="input h-10 text-sm rounded-xl"
              />
            </div>

            {(p.key === "instagram" || p.key === "youtube") ? (
              <button
                type="button"
                onClick={() => setHandle(p.key, "")}
                className="w-9 h-9 rounded-full border border-line text-[var(--muted)] hover:text-ink hover:border-[var(--line-strong)] transition-colors flex items-center justify-center"
                aria-label={`Clear ${p.label}`}
              >
                ×
              </button>
            ) : <span className="w-9 h-9 flex-none" />}
          </div>
        ))}

        <button
          type="button"
          className="self-start mt-1 px-4 h-12 rounded-2xl border border-line bg-white text-ink text-sm font-medium hover:border-[var(--line-strong)] transition-colors"
        >
          + Add another platform
        </button>

        <div className="mt-2 h-12 rounded-xl border border-line bg-white px-4 flex items-center text-sm text-ink">
          <span className="text-[var(--brand-deep)] mr-3">◌</span>
          <span>We never post on your behalf. Linking is for verification + audience match only.</span>
        </div>
      </div>

      <StepFooter
        backHref="/onboarding/profile"
        onContinue={handleContinue}
        continueDisabled={!canContinue}
        continueLabel="Continue →"
        centerText={filledCount > 0 ? `${filledCount} connected · you're good` : ""}
      />
    </div>
  );
}
