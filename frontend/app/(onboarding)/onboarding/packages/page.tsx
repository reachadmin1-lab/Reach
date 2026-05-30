"use client";

import { useEffect, useState } from "react";
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

interface PackageItem {
  id: string;
  tier: string;
  price: number;
  deliverables: string[];
  revisions: number;
  delivery_days: number;
  usage_rights: "personal" | "commercial";
  analytics: boolean;
}

interface PackageAddonItem {
  id: string;
  key: string;
  price: number;
  is_active: boolean;
}

const DEFAULT_TIER: TierConfig = {
  price: "0",
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
    basic: { ...DEFAULT_TIER, price: "12000", delivery_days: 3 },
    standard: { ...DEFAULT_TIER, price: "38000", delivery_days: 5, analytics: true },
    premium: { ...DEFAULT_TIER, price: "90000", delivery_days: 1, usage_rights: "commercial", analytics: true },
  });
  const [campaignEnabled, setCampaignEnabled] = useState(true);
  const [campaignPrice, setCampaignPrice] = useState("150000");
  const [addons, setAddons] = useState<Record<string, AddonConfig>>(
    {
      commercial: { enabled: true, price: "2500" },
      revision: { enabled: true, price: "800" },
      rush: { enabled: false, price: "3000" },
      exclusivity: { enabled: false, price: "5800" },
    }
  );
  const [monthlyOrders, setMonthlyOrders] = useState(5);
  const [isDirty, setIsDirty] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function hydrateFromBackend() {
      try {
        const [savedPackages, savedAddons] = await Promise.all([
          api.get<PackageItem[]>("/packages/my").catch(() => []),
          api.get<PackageAddonItem[]>("/packages/addons/my").catch(() => []),
        ]);

        if (Array.isArray(savedPackages) && savedPackages.length > 0) {
          const baseTiers: Record<string, TierConfig> = {
            basic: { ...DEFAULT_TIER, price: "12000", delivery_days: 3 },
            standard: { ...DEFAULT_TIER, price: "38000", delivery_days: 5, analytics: true },
            premium: { ...DEFAULT_TIER, price: "90000", delivery_days: 1, usage_rights: "commercial", analytics: true },
          };

          let savedCampaignEnabled = false;
          let savedCampaignPrice = "0";

          for (const pkg of savedPackages) {
            const mappedPrice = String(Math.round((pkg.price || 0) / 100));
            if (pkg.tier === "campaign") {
              savedCampaignEnabled = true;
              savedCampaignPrice = mappedPrice;
              continue;
            }
            if (pkg.tier in baseTiers) {
              baseTiers[pkg.tier] = {
                price: mappedPrice,
                revisions: pkg.revisions ?? DEFAULT_TIER.revisions,
                delivery_days: pkg.delivery_days ?? DEFAULT_TIER.delivery_days,
                usage_rights: pkg.usage_rights ?? DEFAULT_TIER.usage_rights,
                analytics: Boolean(pkg.analytics),
                deliverables: Array.isArray(pkg.deliverables) ? pkg.deliverables.join("\n") : "",
              };
            }
          }

          setTiers(baseTiers);
          setCampaignEnabled(savedCampaignEnabled);
          setCampaignPrice(savedCampaignPrice);
        }

        if (Array.isArray(savedAddons) && savedAddons.length > 0) {
          setAddons((prev) => {
            const next = { ...prev };
            for (const addon of savedAddons) {
              if (!(addon.key in next)) continue;
              next[addon.key] = {
                enabled: Boolean(addon.is_active),
                price: String(Math.round((addon.price || 0) / 100)),
              };
            }
            return next;
          });
        }
      } finally {
        setIsDirty(false);
        setHydrated(true);
      }
    }

    void hydrateFromBackend();
  }, []);

  useAutoSave("/onboarding/packages", { tiers, addons, campaign_enabled: campaignEnabled, campaign_price: campaignPrice }, hydrated && isDirty);

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
        title={
          <>
            What do you want to <span className="serif text-brand">charge?</span>
          </>
        }
        subtitle="Three tiered packages. Tune deliverables and price for each. You can rename them later."
      />

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 pb-6 flex flex-col gap-6">
        {/* Tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIER_META.map(({ key, label, dark }) => (
            <div
              key={key}
              className={`rounded-[18px] border p-4 flex flex-col gap-3 relative ${
                dark
                  ? "bg-ink text-white border-[rgba(255,255,255,0.18)]"
                  : "bg-white border-line"
              }`}
            >
              {key === "standard" && (
                <span className="absolute -top-3 left-4 h-6 px-3 rounded-full bg-brand text-white text-[11px] font-semibold inline-flex items-center border border-transparent">⚡ Most booked</span>
              )}
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${dark ? "text-white" : "text-ink"}`}>
                  {label}
                </span>
                <span className={`mono text-[10px] uppercase tracking-[0.1em] ${dark ? "text-[var(--muted-dark)]" : "text-[var(--muted)]"}`}>Edit</span>
              </div>

              {/* Price */}
              <div>
                <label className={`label-eyebrow block mb-1 ${dark ? "text-[var(--muted-dark)]" : ""}`}>
                  Base price
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

              <div className="flex items-center justify-between">
                <span className={`text-xs ${dark ? "text-[var(--muted-dark)]" : "text-[var(--muted)]"}`}>Usage rights</span>
                <select
                  value={tiers[key].usage_rights}
                  onChange={(e) => updateTier(key, "usage_rights", e.target.value as TierConfig["usage_rights"])}
                  className={`text-xs rounded-lg border px-2 h-8 outline-none capitalize ${dark ? "bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.18)] text-white" : "bg-white border-line text-ink"}`}
                >
                  <option value="personal">Personal</option>
                  <option value="commercial">Commercial</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-xs ${dark ? "text-[var(--muted-dark)]" : "text-[var(--muted)]"}`}>Analytics report</span>
                <button
                  type="button"
                  onClick={() => updateTier(key, "analytics", !tiers[key].analytics)}
                  className={`text-xs ${dark ? "text-white" : "text-ink"}`}
                >
                  {tiers[key].analytics ? "Included" : "—"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Campaign toggle */}
        <div className="card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink">Campaign package</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">Optional 4th tier for brand campaigns & longer briefs</p>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <p className="label-eyebrow mb-1 text-right">Starts at</p>
                <div className="flex items-center border border-line rounded-xl h-10 overflow-hidden w-40 bg-white">
                  <span className="pl-3 pr-1 text-sm text-[var(--muted)]">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={campaignPrice}
                    onChange={(e) => {
                      setIsDirty(true);
                      setCampaignPrice(e.target.value);
                    }}
                    placeholder="0"
                    className="flex-1 h-full bg-transparent text-sm outline-none pr-3 text-ink"
                  />
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={campaignEnabled}
                onClick={() => {
                  setIsDirty(true);
                  setCampaignEnabled((v) => !v);
                }}
                className={`w-12 h-7 rounded-full transition-colors relative ${campaignEnabled ? "bg-brand" : "bg-[var(--paper-2)]"}`}
              >
                <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${campaignEnabled ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Add-ons */}
        <div>
          <p className="text-[11px] uppercase tracking-[0.1em] mono text-[var(--muted)] mb-3">Add-ons · applies to all tiers</p>
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
                <div className="flex items-center border border-line rounded-lg h-8 overflow-hidden w-28 bg-white">
                  <span className="pl-2 text-xs text-[var(--muted)]">+₹</span>
                  <input
                    type="number"
                    min="0"
                    value={addons[key].price}
                    onChange={(e) => {
                      updateAddon(key, "price", e.target.value);
                      if (!addons[key].enabled) updateAddon(key, "enabled", true);
                    }}
                    placeholder="0"
                    className="flex-1 h-full bg-transparent text-xs outline-none pr-2 text-ink"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live earning potential */}
        <div className="relative rounded-[18px] bg-ink text-white overflow-hidden p-6">
          <RadarMotif />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <p className="label-eyebrow text-[var(--muted-dark)] mb-3">Earning potential · live estimate</p>
              <p className="text-4xl font-bold">₹{netEarnings.toLocaleString("en-IN")}</p>
              <p className="text-xs text-[var(--muted-dark)] mt-1">Net · after 5% platform fee</p>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[var(--muted-dark)]">Monthly volume</span>
                  <span className="mono text-sm text-white">{monthlyOrders} orders</span>
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
            </div>

            <div className="space-y-3">
              {[
                { label: "Basic", value: basicPrice },
                { label: "Standard", value: stdPrice },
                { label: "Premium", value: premPrice },
                { label: "Campaign", value: campaignEnabled ? parseInt(campaignPrice || "0") : 0 },
              ].map(({ label, value }) => {
                const max = Math.max(basicPrice, stdPrice, premPrice, campaignEnabled ? parseInt(campaignPrice || "0") : 0, 1);
                const width = (value / max) * 100;
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[var(--muted-dark)]">{label}</span>
                      <span className="mono">₹{value.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[rgba(255,255,255,0.12)] overflow-hidden">
                      <div className="h-full bg-brand transition-all" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <StepFooter
        backHref="/onboarding/portfolio"
        onContinue={handleContinue}
        continueDisabled={!canContinue}
        continueLabel="Continue to review →"
      />
    </div>
  );
}
