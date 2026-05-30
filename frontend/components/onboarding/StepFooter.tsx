"use client";

import { useRouter } from "next/navigation";

interface StepFooterProps {
  backHref?: string;
  onContinue?: () => void;
  continueDisabled?: boolean;
  continueLabel?: string;
  loading?: boolean;
  centerText?: string;
}

export function StepFooter({
  backHref,
  onContinue,
  continueDisabled = false,
  continueLabel = "Continue",
  loading = false,
  centerText,
}: StepFooterProps) {
  const router = useRouter();

  return (
    <div className="sticky bottom-0 z-20 bg-paper border-t border-line">
      <div className="max-w-6xl mx-auto w-full grid grid-cols-[auto_1fr_auto] items-center px-6 py-4 gap-4">
        {backHref ? (
          <button
            type="button"
            onClick={() => router.push(backHref)}
            className="btn btn-paper btn-sm"
          >
            Back
          </button>
        ) : (
          <span />
        )}

        <div className="justify-self-start text-[11px] uppercase tracking-[0.1em] mono text-[var(--muted)]">
          {centerText ?? ""}
        </div>

        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled || loading}
          className="btn btn-ink disabled:opacity-40 disabled:cursor-not-allowed min-w-[120px] justify-self-end"
        >
          {loading ? "Saving…" : continueLabel}
        </button>
      </div>
    </div>
  );
}
