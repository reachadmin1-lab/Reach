import { notFound } from "next/navigation";
import { RadarMotif } from "@/components/shared/RadarMotif";
import { PublicProfilePackages } from "@/components/creator/PublicProfilePackages";
import { PublicProfilePortfolio } from "@/components/creator/PublicProfilePortfolio";
import { BookingLinkBlock } from "@/components/creator/BookingLinkBlock";
import type { PublicCreator } from "@/types/creator";

export const revalidate = 60;

async function getCreator(handle: string): Promise<PublicCreator | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/creators/${handle}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { handle: string };
}) {
  const creator = await getCreator(params.handle);
  if (!creator) return { title: "Creator not found" };
  return {
    title: `${creator.display_name ?? params.handle} (@${params.handle}) — Reach`,
    description: creator.bio ?? `Book ${creator.display_name ?? params.handle} on Reach`,
  };
}

export default async function CreatorProfilePage({
  params,
}: {
  params: { handle: string };
}) {
  const { handle } = params;
  const creator = await getCreator(handle);
  if (!creator) notFound();

  const formatNumber = (n?: number) =>
    n
      ? n >= 1_000_000
        ? `${(n / 1_000_000).toFixed(1)}M`
        : n >= 1000
        ? `${(n / 1000).toFixed(0)}K`
        : String(n)
      : "—";

  return (
    <div className="min-h-screen bg-paper">
      {/* ── Hero ── */}
      <div className="relative bg-ink text-white overflow-hidden">
        <RadarMotif />

        {/* Cover image */}
        <div className="relative h-48 md:h-64 overflow-hidden">
          {creator.cover_url ? (
            <img
              src={creator.cover_url}
              alt="Cover"
              className="w-full h-full object-cover opacity-60"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#18181D] to-ink" />
          )}
        </div>

        {/* Avatar + name row */}
        <div className="relative z-10 max-w-5xl mx-auto px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-ink overflow-hidden bg-[#26262C] flex-none">
              {creator.avatar_url ? (
                <img
                  src={creator.avatar_url}
                  alt={creator.display_name ?? handle}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-[var(--muted-dark)]">
                  {(creator.display_name ?? handle)[0].toUpperCase()}
                </div>
              )}
            </div>
            <div className="pb-1">
              <h1 className="text-xl md:text-2xl font-bold text-white leading-tight">
                {creator.display_name ?? handle}
              </h1>
              <p className="mono text-sm text-[var(--muted-dark)]">@{handle}</p>
              {creator.location && (
                <p className="text-xs text-[var(--muted-dark)] mt-0.5">
                  {creator.location}
                </p>
              )}
            </div>
          </div>

          {/* Bio */}
          {creator.bio && (
            <p className="text-sm text-[var(--muted-dark)] max-w-xl leading-relaxed mb-4">
              {creator.bio}
            </p>
          )}

          {/* Stats strip */}
          <div className="grid grid-cols-4 gap-3 max-w-xl">
            {[
              { label: "Reach", value: formatNumber(creator.total_reach) },
              {
                label: "Avg engagement",
                value: creator.avg_engagement
                  ? `${creator.avg_engagement}%`
                  : "—",
              },
              {
                label: "Brands",
                value: creator.brands_count > 0 ? String(creator.brands_count) : "—",
              },
              {
                label: "On time",
                value: creator.on_time_rate ? `${creator.on_time_rate}%` : "—",
              },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <p className="mono text-base font-semibold text-white">{value}</p>
                <p className="text-[10px] text-[var(--muted-dark)] mt-0.5 leading-tight">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-10">
        {/* Genre pills */}
        {creator.genres.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {creator.genres.map((g) => (
              <span key={g} className="pill">
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Packages */}
        <PublicProfilePackages
          packages={creator.packages}
          addons={creator.addons}
          handle={handle}
        />

        {/* Portfolio */}
        {creator.portfolio.length > 0 && (
          <PublicProfilePortfolio items={creator.portfolio} />
        )}

        {/* Booking link block */}
        <BookingLinkBlock handle={handle} />
      </div>

      {/* Mobile sticky CTA */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-line px-4 py-3 flex items-center justify-between z-40">
        <div>
          <p className="text-xs text-[var(--muted)]">Starting from</p>
          <p className="font-semibold text-ink">
            ₹
            {creator.packages[0]?.price
              ? (creator.packages[0].price / 100).toLocaleString("en-IN")
              : "—"}
          </p>
        </div>
        <a href="#packages" className="btn btn-primary btn-sm">
          Book now
        </a>
      </div>
    </div>
  );
}
