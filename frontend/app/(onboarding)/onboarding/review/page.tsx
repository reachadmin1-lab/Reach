"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepFooter } from "@/components/onboarding/StepFooter";
import { api } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";

const SECTIONS = [
  { label: "Basic Profile",  href: "/onboarding/profile",   key: "profile" },
  { label: "Platforms",      href: "/onboarding/platforms", key: "platforms" },
  { label: "Languages",      href: "/onboarding/languages", key: "languages" },
  { label: "Genres",         href: "/onboarding/genres",    key: "genres" },
  { label: "Portfolio",      href: "/onboarding/portfolio", key: "portfolio" },
  { label: "Packages",       href: "/onboarding/packages",  key: "packages" },
];

export default function ReviewStep() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      await api.post("/onboarding/submit");

      // Mark onboarding complete in Supabase user metadata
      // so middleware stops redirecting to /onboarding
      const supabase = createClient();
      await supabase.auth.updateUser({
        data: { onboarding_complete: true },
      });

      router.push("/onboarding/submitted");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <StepHeader
        step={7}
        total={7}
        title="Review your profile"
        subtitle="Everything look good? Submit for review and we'll get back to you within 24 hours."
      />

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left — profile preview card */}
          <div className="card flex flex-col gap-4">
            <p className="label-eyebrow">Profile preview</p>

            {/* Mini hero */}
            <div className="relative h-20 rounded-xl bg-[var(--paper-2)] overflow-hidden">
              <div className="absolute bottom-0 left-4 translate-y-1/2">
                <div className="w-14 h-14 rounded-full border-2 border-white bg-[var(--paper-3)] flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--muted)]">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <p className="font-semibold text-ink">Your display name</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">@yourhandle · India</p>
              <p className="text-sm text-[var(--muted)] mt-2 line-clamp-2">
                Your bio will appear here once you&apos;ve filled it in.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="pill">Travel</span>
              <span className="pill">Fashion</span>
              <span className="pill">Lifestyle</span>
            </div>

            <div className="border-t border-line pt-3 grid grid-cols-3 gap-2 text-center">
              {[["Reach", "—"], ["Engagement", "—"], ["On time", "—"]].map(([label, val]) => (
                <div key={label}>
                  <p className="mono text-sm font-semibold text-ink">{val}</p>
                  <p className="text-[10px] text-[var(--muted)]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — section checklist */}
          <div className="flex flex-col gap-3">
            <p className="label-eyebrow">Sections</p>
            {SECTIONS.map((s) => (
              <div key={s.key} className="flex items-center justify-between py-2.5 border-b border-line last:border-0">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-[var(--green)] flex items-center justify-center flex-none">
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="text-sm text-ink">{s.label}</span>
                </div>
                <Link href={s.href} className="mono text-[11px] text-[var(--muted)] hover:text-ink transition-colors">
                  EDIT
                </Link>
              </div>
            ))}

            {/* Ready to publish card */}
            <div className="mt-2 rounded-[18px] bg-ink text-white p-5">
              <p className="text-sm font-semibold mb-1">Ready to publish</p>
              <p className="text-xs text-[var(--muted-dark)]">
                Your profile will be reviewed by our team. You&apos;ll be notified once it&apos;s live.
              </p>
            </div>

            {error && (
              <p className="text-sm text-[var(--brand)] bg-[var(--rose-soft)] rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>

      <StepFooter
        backHref="/onboarding/packages"
        onContinue={handleSubmit}
        continueLabel="Submit for review"
        loading={submitting}
      />
    </div>
  );
}
