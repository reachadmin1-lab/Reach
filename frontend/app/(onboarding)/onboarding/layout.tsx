import Link from "next/link";
import { ReachMark } from "@/components/shared/ReachMark";

const STEPS = [
  "Profile",
  "Platforms",
  "Languages",
  "Genres",
  "Portfolio",
  "Packages",
  "Review",
];

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper flex flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-paper border-b border-line flex items-center justify-between px-6 h-14">
        <ReachMark className="text-xl text-ink" />
        <Link
          href="/dashboard"
          className="text-sm text-[var(--muted)] hover:text-ink transition-colors"
        >
          Save &amp; exit
        </Link>
      </header>

      {/* Page content — each step page renders its own StepHeader + body */}
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
