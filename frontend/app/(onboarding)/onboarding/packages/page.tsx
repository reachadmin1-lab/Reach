"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepFooter } from "@/components/onboarding/StepFooter";
import { useAutoSave } from "@/lib/hooks/useAutoSave";
import { api } from "@/lib/api/client";
import { RadarMotif } from "@/components/shared/RadarMotif";

interface TierConfig {
  price: string;
  revisions: number;
  delivery_days: number;
  usage_rights: "personal" | "commercial";
  analytics: boolean;
  deliverables: string;
}

interface AddonConfig {
  enabled: boolean;
  price: string;
}

const DEFAULT_TIER: TierConfig = {
  price: "",
  revisions: 2,
  delivery_days: 7,
  usage_rights: "personal",
  analytics: false,
  deliverables: "",
};

const ADDON_KEYS = ["commercial", "revision", "rush", "exclusivity"] as const;
const ADDON_LABELS: Record<string, string> = {
  commercial: "Commercial usage rights",
  revision:   "Additional revision",
  rush:       "Rush delivery (48h)",
  exclusivity: "Extended exclusivity (14 days)",
};

export default function PackagesStep() {
  const router = useRouter();

  const [tiers, setTiers] = useState<Record<string, TierConfig>>({
    basic:    { ...DEFAULT_TIER },
    standard: { ...DEFAULT_TIER },
    premium:  { ...DEFAULT_TIER },
  });
  const [campaignEnabled, setCampaignEnabled] = useState(false);
  const [campaignPrice, setCampaignPrice] = useState("");
  const [addons, setAddons] = useState<Record<string, AddonConfig>>(
    Object.fromEntries(ADDON_KEYS.map((k) => [k, { enabled: false, price: "" }]))
  );
  const [monthlyOrders, setMonthlyOrders] = useState(5);
  const [isDirty, setIsDirty] = useState(false);

  useAutoSave("/onboarding/packages", { tiers, addons, campaign_enabled: campaignEnabled, campaign_price: campaignPrice }, isDirty);

  const basicPrice  = parseInt(tiers.basic.price)    || 0;
  const stdPrice    = parseInt(tiers.standard.price)  || 0;
  const premPrice   = parseInt(tiers.premium.price)   || 0;
  const avgPrice    = (basicPrice + stdPrice + premPrice) / (basicPrice || stdPrice || premPrice ? 3 : 1);
  const netEarnings = Math.round(avgPrice * monthlyOrders * 0.95);

  const canContinue =
    parseInt(tiers.basic.price) > 0 && parseInt(tiers.standard.price) > 0;

  function updateTier(tier: string, field: keyof TierConfig, value: unknown) {
    setIsDirty(true);
    setTiers((prev) => ({ ...prev, [tier]: { ...prev[tier], [field]: value } }));
  }

  function updateAddon(key: string, field: "enabled" | "price", value: unknown) {
    setIsDirty(true);
    setAddons((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  }

  async function handleContinue() {
    await api.patch("/onboarding/packages", {
      tiers,
      addons,
      campaign_enabled: campaignEnabled,
      campaign_price: campaignPrice,
    });
    router.push("/onboarding/review");
  }

  const TIER_META = [
    { key: "basic",    label: "Basic",    dark: false },
    { key: "standard", label: "Standard", dark: true  },
    { key: "premium",  label: "Premium",  dark: false },
  ];

  return (
    <div className="flex flex-col flex-1">
      <StepHeader
        step={6}
        total={7}
        title="Set your packages"
        subtitle="Define what brands get at each tier. Basic and Standard are required."
      />

      <div className="flex-1 max-w-3xl mx-auto w-full px-6 pb-6 flex flex-col gap-8">
        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIER_META.map(({ key, label, dark }) => (
            <div
              key={key}
              className={`rounded-[18px] border p-5 flex flex-col gap-4 ${
                dark
                  ? "bg-ink text-white border-[rgba(255,255,255,0.18)]"
                  : "bg-white border-line"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${dark ? "text-white" : "text-ink"}`}>
                  {label}
                </span>
                {key === "standard" && (
                  <span className="pill brand text-[10px] h-5 px-2">Most booked</span>
                )}
              </div>

              {/* Price */}
              <div>
                <label className={`label-eyebrow block mb-1 ${dark ? "text-[var(--muted-dark)]" : ""}`}>
                  Price (₹)
                </label>
                <div className={`flex items-center border rounded-xl h-11 overflow-hidden ${
                  dark ? "border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.06)]" : "border-line bg-white"
                }`}>
                  <span className={`pl-3 pr-1 text-sm ${dark ? "text-[var(--muted-dark)]" : "text-[var(--muted)]"}`}>₹</span>
                  <input
                    type="number"
                    min="0"
                    value={tiers[key].price}
                    onChange={(e) => updateTier(key, "price", e.target.value)}
                    placeholder="0"
                    className={`flex-1 h-full bg-transparent text-sm outline-none pr-3 ${dark ? "text-white placeholder:text-[var(--muted-dark)]" : "text-ink"}`}
                  />
                </div>
              </div>

              {/* Deliverables */}
              <div>
                <label className={`label-eyebrow block mb-1 ${dark ? "text-[var(--muted-dark)]" : ""}`}>
                  Deliverables
                </label>
                <textarea
                  value={tiers[key].deliverables}
                  onChange={(e) => updateTier(key, "deliverables", e.target.value)}
                  placeholder="e.g. 1 Instagram Reel, 3 Stories"
                  rows={2}
                  className={`w-full rounded-xl border text-sm p-2.5 resize-none outline-none ${
                    dark
                      ? "bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.18)] text-white placeholder:text-[var(--muted-dark)]"
                      : "bg-white border-line text-ink"
                  }`}
                />
              </div>

              {/* Revisions */}
              <div className="flex items-center justify-between">
                <span className={`text-xs ${dark ? "text-[var(--muted-dark)]" : "text-[var(--muted)]"}`}>Revisions</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateTier(key, "revisions", Math.max(1, tiers[key].revisions - 1))}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center text-sm ${dark ? "border-[rgba(255,255,255,0.18)] text-white" : "border-line text-ink"}`}
                  >−</button>
                  <span className={`mono text-sm w-4 text-center ${dark ? "text-white" : "text-ink"}`}>{tiers[key].revisions}</span>
                  <button
                    type="button"
                    onClick={() => updateTier(key, "revisions", Math.min(10, tiers[key].revisions + 1))}
                    className={`w-7 h-7 rounded-full border flex items-center justify-center text-sm ${dark ? "border-[rgba(255,255,255,0.18)] text-white" : "border-line text-ink"}`}
                  >+</button>
                </div>
              </div>

              {/* Delivery days */}
              <div className="flex items-center justify-between">
                <span className={`text-xs ${dark ? "text-[var(--muted-dark)]" : "text-[var(--muted)]"}`}>Delivery</span>
                <select
                  value={tiers[key].delivery_days}
                  onChange={(e) => updateTier(key, "delivery_days", parseInt(e.target.value))}
                  className={`text-xs rounded-lg border px-2 h-8 outline-none ${dark ? "bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.18)] text-white" : "bg-white border-line text-ink"}`}
                >
                  {[3,5,7,10,14,21,30].map((d) => (
                    <option key={d} value={d}>{d} days</option>
                  ))}
                </select>
              </div>

              {/* Analytics toggle */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className={`text-xs ${dark ? "text-[var(--muted-dark)]" : "text-[var(--muted)]"}`}>Analytics report</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={tiers[key].analytics}
                  onClick={() => updateTier(key, "analytics", !tiers[key].analytics)}
                  className={`w-9 h-5 rounded-full transition-colors relative ${tiers[key].analytics ? "bg-brand" : dark ? "bg-[rgba(255,255,255,0.18)]" : "bg-[var(--paper-2)]"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${tiers[key].analytics ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              </label>
            </div>
          ))}
        </div>

        {/* Campaign toggle */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-ink">Campaign package</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">For long-term brand partnerships</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={campaignEnabled}
              onClick={() => setCampaignEnabled((v) => !v)}
              className={`w-9 h-5 rounded-full transition-colors relative ${campaignEnabled ? "bg-brand" : "bg-[var(--paper-2)]"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${campaignEnabled ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
          </div>
          {campaignEnabled && (
            <div className="flex items-center border border-line rounded-xl h-11 overflow-hidden">
              <span className="pl-3 pr-1 text-sm text-[var(--muted)]">Starting at ₹</span>
              <input
                type="number"
                min="0"
                value={campaignPrice}
                onChange={(e) => setCampaignPrice(e.target.value)}
                placeholder="0"
                className="flex-1 h-full bg-transparent text-sm outline-none pr-3 text-ink"
              />
            </div>
          )}
        </div>

        {/* Add-ons */}
        <div>
          <p className="text-sm font-semibold text-ink mb-3">Add-ons</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ADDON_KEYS.map((key) => (
              <div key={key} className="card p-4 flex items-center gap-3">
                <input
                  type="checkbox"
                  id={`addon-${key}`}
                  checked={addons[key].enabled}
                  onChange={(e) => updateAddon(key, "enabled", e.target.checked)}
                  className="w-4 h-4 accent-brand flex-none"
                />
                <label htmlFor={`addon-${key}`} className="flex-1 text-sm text-ink cursor-pointer">
                  {ADDON_LABELS[key]}
                </label>
                {addons[key].enabled && (
                  <div className="flex items-center border border-line rounded-lg h-8 overflow-hidden w-24">
                    <span className="pl-2 text-xs text-[var(--muted)]">₹</span>
                    <input
                      type="number"
                      min="0"
                      value={addons[key].price}
                      onChange={(e) => updateAddon(key, "price", e.target.value)}
                      placeholder="0"
                      className="flex-1 h-full bg-transparent text-xs outline-none pr-2 text-ink"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Live earning potential */}
        <div className="relative rounded-[18px] bg-ink text-white overflow-hidden p-6">
          <RadarMotif />
          <div className="relative z-10">
            <p className="label-eyebrow text-[var(--muted-dark)] mb-4">Live earning potential</p>
            <div className="flex items-end gap-2 mb-4">
              <span className="text-3xl font-bold">₹{netEarnings.toLocaleString("en-IN")}</span>
              <span className="text-sm text-[var(--muted-dark)] mb-1">/month est.</span>
            </div>
            <p className="text-xs text-[var(--muted-dark)] mb-4">After 5% platform fee</p>

            {/* Monthly orders slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--muted-dark)]">Monthly orders</span>
                <span className="mono text-sm text-white">{monthlyOrders}</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={monthlyOrders}
                onChange={(e) => setMonthlyOrders(parseInt(e.target.value))}
                className="w-full accent-brand"
              />
            </div>

            {/* Tier price bars */}
            {(basicPrice || stdPrice || premPrice) > 0 && (
              <div className="flex items-end gap-2 mt-4 h-12">
                {[
                  { label: "Basic", price: basicPrice },
                  { label: "Std",   price: stdPrice },
                  { label: "Prem",  price: premPrice },
                ].map(({ label, price }) => {
                  const max = Math.max(basicPrice, stdPrice, premPrice, 1);
                  const pct = (price / max) * 100;
                  return (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-brand/60 transition-all"
                        style={{ height: `${pct}%`, minHeight: price > 0 ? "4px" : "0" }}
                      />
                      <span className="text-[10px] text-[var(--muted-dark)]">{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <StepFooter
        backHref="/onboarding/portfolio"
        onContinue={handleContinue}
        continueDisabled={!canContinue}
      />
    </div>
  );
}
