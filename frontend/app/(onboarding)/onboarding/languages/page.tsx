"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepFooter } from "@/components/onboarding/StepFooter";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { api } from "@/lib/api/client";

const PRESET_LANGUAGES = [
  "Hindi", "English", "Tamil", "Telugu", "Kannada",
  "Malayalam", "Marathi", "Bengali", "Gujarati", "Punjabi",
  "Odia", "Urdu", "Assamese", "Maithili", "Bhojpuri",
  "Rajasthani", "Sanskrit",
];

export default function LanguagesStep() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function hydrateFromBackend() {
      try {
        const progress = await api.get<{ languages: string[] | null }>("/onboarding/progress");
        setSelected(progress.languages ?? []);
      } catch {
        setSelected([]);
      } finally {
        setHydrated(true);
      }
    }

    void hydrateFromBackend();
  }, []);

  useAutoSave("/onboarding/languages", { languages: selected }, hydrated);

  const canContinue = selected.length >= 1;

  function toggle(lang: string) {
    setSelected((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  }

  function addCustom() {
    const trimmed = customInput.trim();
    if (trimmed && !selected.includes(trimmed)) {
      setSelected((prev) => [...prev, trimmed]);
    }
    setCustomInput("");
    setShowCustom(false);
  }

  async function handleContinue() {
    await api.patch("/onboarding/languages", { languages: selected });
    router.push("/onboarding/genres");
  }

  return (
    <div className="flex flex-col flex-1">
      <StepHeader
        step={3}
        total={7}
        title="Languages you create in"
        subtitle="Select all languages your content is in."
      />

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 pb-6 flex flex-col gap-5">
        {/* Selected summary */}
        {selected.length > 0 && (
          <div className="card p-4">
            <p className="label-eyebrow mb-2">Selected</p>
            <div className="flex flex-wrap gap-2">
              {selected.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggle(lang)}
                  className="pill dark gap-2"
                >
                  {lang}
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Chip grid */}
        <div className="flex flex-wrap gap-2">
          {PRESET_LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => toggle(lang)}
              className={`h-[34px] px-4 rounded-full text-sm border transition-all ${
                selected.includes(lang)
                  ? "bg-ink text-white border-ink"
                  : "bg-white text-ink border-line hover:border-[var(--line-strong)]"
              }`}
            >
              {lang}
            </button>
          ))}

          {/* Add custom */}
          {showCustom ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCustom()}
                placeholder="Language name"
                autoFocus
                className="h-[34px] px-3 rounded-full text-sm border border-brand outline-none w-36"
              />
              <button type="button" onClick={addCustom} className="btn btn-primary btn-sm">
                Add
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCustom(true)}
              className="h-[34px] px-4 rounded-full text-sm border border-dashed border-line text-[var(--muted)] hover:border-ink hover:text-ink transition-all"
            >
              + Add custom
            </button>
          )}
        </div>
      </div>

      <StepFooter
        backHref="/onboarding/platforms"
        onContinue={handleContinue}
        continueDisabled={!canContinue}
      />
    </div>
  );
}
