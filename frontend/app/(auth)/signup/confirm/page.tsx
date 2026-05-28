"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { RadarMotif } from "@/components/shared/RadarMotif";
import { ReachMark } from "@/components/shared/ReachMark";

function ConfirmContent() {
  const params = useSearchParams();
  const email = params.get("email") ?? "your email";

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-ink text-white">
      <div className="relative flex-1 flex flex-col justify-center px-10 py-16 overflow-hidden">
        <RadarMotif />
        <div className="relative z-10 max-w-sm">
          <ReachMark className="text-3xl text-white mb-8" />
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Almost <span className="serif text-[var(--brand-warm)]">there.</span>
          </h1>
          <p className="text-[var(--muted-dark)] text-base leading-relaxed">
            One quick step before you start earning.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12 md:w-[480px] md:min-h-screen">
        <div className="w-full max-w-sm bg-white text-ink rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-14 h-14 rounded-full bg-[var(--paper-2)] flex items-center justify-center mx-auto mb-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>

          <h2 className="text-xl font-semibold mb-2">Check your inbox</h2>
          <p className="text-sm text-[var(--muted)] mb-1">
            We sent a confirmation link to
          </p>
          <p className="text-sm font-medium text-ink mb-6 break-all">{email}</p>

          <p className="text-xs text-[var(--muted)] leading-relaxed mb-6">
            Click the link in the email to verify your account and complete signup.
            After confirming, come back and log in.
          </p>

          <Link href="/login" className="btn btn-ink w-full justify-center">
            Go to login
          </Link>

          <p className="text-xs text-[var(--muted)] mt-4">
            Wrong email?{" "}
            <Link href="/signup" className="underline underline-offset-2 text-ink">
              Sign up again
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  );
}
