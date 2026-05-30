"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepFooter } from "@/components/onboarding/StepFooter";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { api } from "@/lib/api/client";

const MAX_GENRES = 10;

const GENRE_GROUPS = [
  {
    label: "Lifestyle",
    genres: ["Fashion", "Beauty", "Fitness", "Food", "Travel", "Home & Decor", "Parenting", "Wellness"],
  },
  {
    label: "Entertainment",
    genres: ["Comedy", "Music", "Dance", "Gaming", "Movies & TV", "Memes", "Vlogs"],
  },
  {
    label: "Knowledge",
    genres: ["Finance", "Tech", "Education", "Science", "Business", "Self-help", "News & Politics"],
  },
  {
    label: "Sports",
    genres: ["Cricket", "Football", "Fitness & Gym", "Yoga", "Esports", "Outdoor Sports"],
  },
  {
    label: "Culture",
    genres: ["Art", "Photography", "Spirituality", "Sustainability", "LGBTQ+", "Diversity"],
  },
];

export default function GenresStep() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function hydrateFromBackend() {
      try {
        const progress = await api.get<{ genres: string[] | null }>("/onboarding/progress");
        setSelected(progress.genres ?? []);
      } catch {
        setSelected([]);
      } finally {
        setHydrated(true);
      }
    }

    void hydrateFromBackend();
  }, []);

  useAutoSave("/onboarding/genres", { genres: selected }, hydrated);

  function toggle(genre: string) {
    setSelected((prev) => {
      if (prev.includes(genre)) return prev.filter((g) => g !== genre);
      if (prev.length >= MAX_GENRES) return prev; // cap at 10
      return [...prev, genre];
    });
  }

  async function handleContinue() {
    await api.patch("/onboarding/genres", { genres: selected });
    router.push("/onboarding/portfolio");
  }

  return (
    <div className="flex flex-col flex-1">
      <StepHeader
        step={4}
        total={7}
        title="Pick your genres"
        subtitle="Choose up to 10 categories that best describe your content."
      />

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 pb-6 flex flex-col gap-6">
        {/* Selection counter */}
        <div className="flex items-center justify-between">
          <span className="mono text-sm text-[var(--muted)]">
            {selected.length} / {MAX_GENRES} selected
          </span>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => setSelected([])}
              className="text-xs text-[var(--muted)] underline underline-offset-2"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Genre groups */}
        {GENRE_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="label-eyebrow mb-2">{group.label}</p>
            <div className="flex flex-wrap gap-2">
              {group.genres.map((genre) => {
                const isSelected = selected.includes(genre);
                const isDisabled = !isSelected && selected.length >= MAX_GENRES;
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggle(genre)}
                    disabled={isDisabled}
                    className={`h-[34px] px-4 rounded-full text-sm border transition-all ${
                      isSelected
                        ? "bg-ink text-white border-ink"
                        : isDisabled
                        ? "bg-white text-[var(--muted-2)] border-line cursor-not-allowed opacity-50"
                        : "bg-white text-ink border-line hover:border-[var(--line-strong)]"
                    }`}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <StepFooter
        backHref="/onboarding/languages"
        onContinue={handleContinue}
        continueDisabled={selected.length === 0}
      />
    </div>
  );
}
