"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";

interface ProgressResponse {
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  location: string | null;
  platforms: Record<string, string>;
  languages: string[];
  genres: string[];
  status: string;
}

export default function OnboardingEntryPage() {
  const router = useRouter();

  useEffect(() => {
    async function resolveStep() {
      try {
        const progress = await api.get<ProgressResponse>("/onboarding/progress");

        if (!progress.display_name || !progress.bio) {
          router.replace("/onboarding/profile");
          return;
        }

        if (!progress.platforms || Object.keys(progress.platforms).length === 0) {
          router.replace("/onboarding/platforms");
          return;
        }

        if (!progress.languages || progress.languages.length === 0) {
          router.replace("/onboarding/languages");
          return;
        }

        if (!progress.genres || progress.genres.length === 0) {
          router.replace("/onboarding/genres");
          return;
        }

        // Portfolio/packages completion is validated on submit.
        // Resume from step 5 once first four sections are complete.
        router.replace("/onboarding/portfolio");
      } catch {
        router.replace("/onboarding/profile");
      }
    }

    void resolveStep();
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <p className="text-sm text-[var(--muted)]">Resuming your onboarding...</p>
    </div>
  );
}
