"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepFooter } from "@/components/onboarding/StepFooter";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { api } from "@/lib/api/client";

const PLATFORMS = [
  { key: "instagram", label: "Instagram", hint: "@yourhandle", icon: "📸" },
  { key: "youtube",   label: "YouTube",   hint: "youtube.com/c/yourchannel", icon: "▶️" },
  { key: "tiktok",    label: "TikTok",    hint: "@yourhandle", icon: "🎵" },
  { key: "x",         label: "X (Twitter)", hint: "@yourhandle", icon: "𝕏" },
  { key: "linkedin",  label: "LinkedIn",  hint: "linkedin.com/in/yourprofile", icon: "💼" },
];

export default function PlatformsStep() {
  const router = useRouter();
  const [handles, setHandles] = useState<Record<string, string>>({});

  useAutoSave("/onboarding/platforms", { platforms: handles });

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
        title="Connect your platforms"
        subtitle="Add at least one social platform so brands can see your reach."
      />

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 pb-6 flex flex-col gap-3">
        {/* Connected count */}
        {filledCount > 0 && (
          <div className="flex items-center gap-2 mb-1">
            <span className="pill green">{filledCount} connected</span>
          </div>
        )}

        {PLATFORMS.map((p) => (
          <div key={p.key} className="card p-4 flex items-center gap-4">
            <span className="text-2xl w-8 text-center flex-none">{p.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink mb-1">{p.label}</p>
              <input
                type="text"
                value={handles[p.key] ?? ""}
                onChange={(e) => setHandle(p.key, e.target.value)}
                placeholder={p.hint}
                className="input h-10 text-sm"
              />
            </div>
            {handles[p.key]?.trim() && (
              <span className="w-5 h-5 rounded-full bg-[var(--green)] flex items-center justify-center flex-none">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
            )}
          </div>
        ))}
      </div>

      <StepFooter
        backHref="/onboarding/profile"
        onContinue={handleContinue}
        continueDisabled={!canContinue}
      />
    </div>
  );
}
