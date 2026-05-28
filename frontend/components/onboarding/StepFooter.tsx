"use client";

import { useRouter } from "next/navigation";

interface StepFooterProps {
  backHref?: string;
  onContinue?: () => void;
  continueDisabled?: boolean;
  continueLabel?: string;
  loading?: boolean;
}

export function StepFooter({
  backHref,
  onContinue,
  continueDisabled = false,
  continueLabel = "Continue",
  loading = false,
}: StepFooterProps) {
  const router = useRouter();

  return (
    <div className="sticky bottom-0 z-20 bg-paper border-t border-line">
      <div className="max-w-2xl mx-auto w-full flex items-center justify-between px-6 py-4 gap-4">
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

        <button
          type="button"
          onClick={onContinue}
          disabled={continueDisabled || loading}
          className="btn btn-ink disabled:opacity-40 disabled:cursor-not-allowed min-w-[120px]"
        >
          {loading ? "Saving…" : continueLabel}
        </button>
      </div>
    </div>
  );
}
