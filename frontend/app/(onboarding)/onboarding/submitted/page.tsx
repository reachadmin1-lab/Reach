import Link from "next/link";
import { RadarMotif } from "@/components/shared/RadarMotif";
import { ReachMark } from "@/components/shared/ReachMark";

export default function SubmittedPage() {
  return (
    <div className="min-h-screen bg-ink text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <RadarMotif />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
        {/* Envelope icon */}
        <div className="w-16 h-16 rounded-full bg-[rgba(255,65,24,0.15)] border border-[rgba(255,65,24,0.3)] flex items-center justify-center mb-6">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-brand">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="m2 7 10 7 10-7"/>
          </svg>
        </div>

        <ReachMark className="text-2xl text-white mb-4" />
        <h1 className="text-3xl font-bold mb-3">
          You&apos;re on{" "}
          <span className="serif text-[var(--brand-warm)]">the list.</span>
        </h1>
        <p className="text-[var(--muted-dark)] text-sm leading-relaxed mb-8">
          Your profile is under review. We&apos;ll notify you by email within 24 hours once it&apos;s approved and live.
        </p>

        {/* Profile summary card */}
        <div className="w-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] rounded-2xl p-5 mb-8 text-left">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.1)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--muted-dark)]">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Your profile</p>
              <p className="text-xs text-[var(--muted-dark)]">@yourhandle</p>
            </div>
            <span className="ml-auto pill outline-dark text-[10px] h-5 px-2">Under review</span>
          </div>
          <p className="text-xs text-[var(--muted-dark)]">
            You&apos;ll receive an email at your registered address when your profile goes live.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 w-full">
          <Link href="/dashboard" className="btn btn-primary w-full justify-center">
            Continue to dashboard
          </Link>
          <Link href="/" className="btn btn-ghost on-dark w-full justify-center text-[var(--muted-dark)]">
            View preview
          </Link>
        </div>
      </div>
    </div>
  );
}
