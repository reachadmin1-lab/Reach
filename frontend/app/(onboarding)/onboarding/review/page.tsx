"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepFooter } from "@/components/onboarding/StepFooter";
import { api } from "@/lib/api/client";
import { createClient } from "@/lib/supabase/client";
import { RadarMotif } from "@/components/shared/RadarMotif";

const SECTIONS = [
  { label: "Basic Profile",  href: "/onboarding/profile",   key: "profile" },
  { label: "Platforms",      href: "/onboarding/platforms", key: "platforms" },
  { label: "Languages",      href: "/onboarding/languages", key: "languages" },
  { label: "Genres",         href: "/onboarding/genres",    key: "genres" },
  { label: "Portfolio",      href: "/onboarding/portfolio", key: "portfolio" },
  { label: "Packages",       href: "/onboarding/packages",  key: "packages" },
];

interface ProgressResponse {
  display_name: string | null;
  bio: string | null;
  platforms: Record<string, string>;
  languages: string[];
  genres: string[];
}

interface PackageItem {
  id: string;
  tier: string;
  price: number;
}

interface PortfolioItem {
  id: string;
}

export default function ReviewStep() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState("Your profile");
  const [handle, setHandle] = useState("yourhandle");
  const [bio, setBio] = useState("Your bio preview will appear here.");
  const [languages, setLanguages] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [platformCount, setPlatformCount] = useState(0);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [portfolioCount, setPortfolioCount] = useState(0);

  useEffect(() => {
    async function loadPreviewData() {
      try {
        const supabase = createClient();
        const [{ data: userData }, progress, packageData, portfolioData] = await Promise.all([
          supabase.auth.getUser(),
          api.get<ProgressResponse>("/onboarding/progress"),
          api.get<PackageItem[]>("/packages/my").catch(() => []),
          api.get<PortfolioItem[]>("/onboarding/portfolio").catch(() => []),
        ]);

        const metadata = userData.user?.user_metadata as Record<string, unknown> | undefined;
        const metaHandle = String(metadata?.handle ?? "").trim();
        const name = String(progress.display_name ?? metadata?.full_name ?? "").trim();
        const profileBio = String(progress.bio ?? "").trim();

        setDisplayName(name || "Your profile");
        setHandle(metaHandle || "yourhandle");
        setBio(profileBio || "Your bio preview will appear here.");
        setLanguages(progress.languages || []);
        setGenres(progress.genres || []);
        setPlatformCount(Object.keys(progress.platforms || {}).length);
        setPackages(Array.isArray(packageData) ? packageData : []);
        setPortfolioCount(Array.isArray(portfolioData) ? portfolioData.length : 0);
      } catch {
        // Keep non-blocking fallbacks
      }
    }

    void loadPreviewData();
  }, []);

  const initials = useMemo(() => {
    const tokens = displayName.trim().split(/\s+/).filter(Boolean);
    const raw = tokens.slice(0, 2).map((t) => t[0]).join("");
    return (raw || "YR").toUpperCase();
  }, [displayName]);

  const packageRows = useMemo(() => {
    if (!packages.length) return [];
    const order = ["basic", "standard", "premium", "campaign"];
    return packages
      .slice()
      .sort((a, b) => order.indexOf(a.tier) - order.indexOf(b.tier))
      .map((p) => ({
        label: p.tier.charAt(0).toUpperCase() + p.tier.slice(1),
        price: `₹${Math.round((p.price || 0) / 100).toLocaleString("en-IN")}`,
      }));
  }, [packages]);

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
        title={
          <>
            Looking <span className="serif text-brand">sharp.</span> One last look.
          </>
        }
        subtitle="This is exactly what brands will see when they land on your booking link."
      />

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_270px] gap-6">
          {/* Left — profile preview card */}
          <div className="card p-0 overflow-hidden">
            <div className="relative h-[138px] bg-ink overflow-hidden">
              <RadarMotif />
            </div>

            <div className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-14 h-14 rounded-full bg-brand text-white text-xl font-semibold flex items-center justify-center">
                  {initials}
                </div>
                <div>
                  <p className="font-semibold text-ink text-lg">{displayName}</p>
                  <p className="text-xs text-[var(--muted)] mt-0.5">reach.app/@{handle}</p>
                </div>
              </div>

              <p className="text-sm text-ink mt-4">
                {bio}
              </p>

              <div className="flex flex-wrap gap-2 pt-3">
                {genres.length > 0 ? (
                  genres.slice(0, 3).map((genre) => <span key={genre} className="pill">{genre}</span>)
                ) : (
                  <span className="pill">No genres selected</span>
                )}
              </div>

              <div className="border-t border-line mt-4 pt-4">
                <p className="text-[11px] uppercase tracking-[0.1em] mono text-[var(--muted)] mb-2">
                  Packages · {packageRows.length ? `${packageRows.length} tiers` : "not added"}
                </p>
                <div className="space-y-2">
                  {(packageRows.length ? packageRows : [{ label: "Basic", price: "₹0" }, { label: "Standard", price: "₹0" }]).map(({ label, price }) => (
                    <div key={label} className="h-10 rounded-lg bg-[var(--paper)] border border-line px-3 flex items-center justify-between">
                      <span className="text-sm text-ink">{label}</span>
                      <span className="text-sm font-semibold text-ink">{price}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right — section checklist */}
          <div className="flex flex-col gap-3">
            <p className="label-eyebrow">Section checklist</p>
            {SECTIONS.map((s) => (
              <div key={s.key} className="bg-white border border-line rounded-2xl px-4 py-3">
                <div className="flex items-center justify-between">
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
                <p className="text-xs text-[var(--muted)] mt-1.5 ml-8">
                  {s.key === "profile" && `${displayName} · @${handle}`}
                  {s.key === "platforms" && `${platformCount} connected`}
                  {s.key === "languages" && (languages.length ? languages.join(", ") : "None selected")}
                  {s.key === "genres" && `${genres.length} selected`}
                  {s.key === "portfolio" && (portfolioCount > 0 ? `${portfolioCount} items` : "No items added")}
                  {s.key === "packages" && `${packageRows.length || 0} tiers`}
                </p>
              </div>
            ))}

            {/* Ready to publish card */}
            <div className="mt-1 rounded-[18px] bg-ink text-white p-5 relative overflow-hidden">
              <RadarMotif />
              <p className="label-eyebrow text-[var(--muted-dark)] mb-2 relative z-10">Ready to publish</p>
              <p className="text-sm text-white/90 relative z-10">
                We&apos;ll review your profile in 24-48 hours. You&apos;ll get an email + push when you&apos;re live.
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
        continueLabel="Submit for review →"
        loading={submitting}
      />
    </div>
  );
}
