"use client";

import { useState } from "react";
import type { PublicPackage, PublicAddon } from "@/types/creator";

interface Props {
  packages: PublicPackage[];
  addons: PublicAddon[];
  handle: string;
}

const TIER_ORDER = ["basic", "standard", "premium", "campaign"];

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function PublicProfilePackages({ packages, addons, handle }: Props) {
  const sorted = [...packages].sort(
    (a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier)
  );
  const [activeTab, setActiveTab] = useState(sorted[0]?.tier ?? "basic");
  const activePkg = sorted.find((p) => p.tier === activeTab) ?? sorted[0];

  if (!sorted.length) return null;

  return (
    <section id="packages">
      <h2 className="text-lg font-semibold text-ink mb-4">Packages</h2>

      {/* Mobile: tab switcher */}
      <div className="md:hidden flex gap-2 mb-4 overflow-x-auto pb-1">
        {sorted.map((pkg) => (
          <button
            key={pkg.tier}
            type="button"
            onClick={() => setActiveTab(pkg.tier)}
            className={`flex-none h-9 px-4 rounded-full text-sm font-medium border transition-all ${
              activeTab === pkg.tier
                ? "bg-ink text-white border-ink"
                : "bg-white text-ink border-line"
            }`}
          >
            {pkg.name}
          </button>
        ))}
      </div>

      {/* Mobile: active package card */}
      <div className="md:hidden">
        {activePkg && <PackageCard pkg={activePkg} handle={handle} />}
      </div>

      {/* Desktop: 3-column grid */}
      <div className="hidden md:grid grid-cols-3 gap-4">
        {sorted.filter((p) => p.tier !== "campaign").map((pkg) => (
          <PackageCard key={pkg.tier} pkg={pkg} handle={handle} />
        ))}
      </div>

      {/* Add-ons */}
      {addons.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-ink mb-3">Add-ons</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {addons.map((addon) => (
              <div key={addon.key} className="card p-4 flex items-center justify-between gap-3">
                <span className="text-sm text-ink">{addon.label}</span>
                <span className="mono text-sm font-semibold text-ink whitespace-nowrap">
                  +{fmt(addon.price)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom request card */}
      <div className="mt-4 border-2 border-dashed border-line rounded-[18px] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <p className="font-medium text-ink">Need something custom?</p>
          <p className="text-sm text-[var(--muted)] mt-0.5">
            Send a brief and get a tailored quote.
          </p>
        </div>
        <a
          href={`mailto:?subject=Custom request for @${handle}`}
          className="btn btn-paper btn-sm whitespace-nowrap"
        >
          Send a brief
        </a>
      </div>
    </section>
  );
}

function PackageCard({ pkg, handle }: { pkg: PublicPackage; handle: string }) {
  const isPopular = pkg.tier === "standard";
  const dark = isPopular;

  return (
    <div
      className={`rounded-[18px] border p-6 flex flex-col gap-4 ${
        dark
          ? "bg-ink text-white border-[rgba(255,255,255,0.18)]"
          : "bg-white border-line"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-sm font-semibold ${dark ? "text-white" : "text-ink"}`}>
          {pkg.name}
        </span>
        {isPopular && (
          <span className="pill brand text-[10px] h-5 px-2">Most booked</span>
        )}
      </div>

      <div>
        <span className={`text-3xl font-bold ${dark ? "text-white" : "text-ink"}`}>
          {(pkg.price / 100).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
        </span>
      </div>

      <div className={`flex items-center gap-3 text-xs ${dark ? "text-[var(--muted-dark)]" : "text-[var(--muted)]"}`}>
        <span>{pkg.delivery_days}d delivery</span>
        <span>·</span>
        <span>{pkg.revisions} revision{pkg.revisions !== 1 ? "s" : ""}</span>
      </div>

      {pkg.deliverables.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {pkg.deliverables.map((d, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-none">
                <circle cx="7" cy="7" r="7" fill={dark ? "rgba(255,255,255,0.15)" : "rgba(11,11,15,0.08)"}/>
                <path d="M4 7l2 2 4-4" stroke={dark ? "white" : "#0B0B0F"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className={dark ? "text-[var(--muted-dark)]" : "text-[var(--muted)]"}>{d}</span>
            </li>
          ))}
        </ul>
      )}

      <div className={`flex items-center gap-2 text-xs mt-auto pt-2 border-t ${dark ? "border-[rgba(255,255,255,0.12)] text-[var(--muted-dark)]" : "border-line text-[var(--muted)]"}`}>
        <span>{pkg.usage_rights === "commercial" ? "Commercial use" : "Personal use"}</span>
        {pkg.analytics && <><span>·</span><span>Analytics report</span></>}
      </div>

      <a
        href={`#book-${pkg.tier}`}
        className={`btn w-full justify-center ${dark ? "btn-primary" : "btn-ink"}`}
      >
        Select {pkg.name}
      </a>
    </div>
  );
}
