"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import type { PublicPackage, PublicAddon } from "@/types/creator";

interface Props {
  handle: string;
  packages: PublicPackage[];
  addons: PublicAddon[];
}

type Step = "package" | "addons" | "brief" | "confirm";

function fmt(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export function BookingFlow({ handle, packages, addons }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("package");
  const [selectedPkg, setSelectedPkg] = useState<PublicPackage | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addonTotal = addons
    .filter((a) => selectedAddons.includes(a.key))
    .reduce((sum, a) => sum + a.price, 0);
  const total = (selectedPkg?.price ?? 0) + addonTotal;

  function toggleAddon(key: string) {
    setSelectedAddons((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleConfirm() {
    if (!selectedPkg) return;
    setError("");
    setLoading(true);
    try {
      // Create order — chat opens immediately, payment comes later
      const order = await api.post<{ id: string; order_ref: string }>("/orders", {
        creator_handle: handle,
        package_id: selectedPkg.id,
        addon_keys: selectedAddons,
        brief: brief || undefined,
      });

      // Redirect to order page — brand chats with creator first, then funds escrow
      router.push(`/brand/orders/${order.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-line">
          <h2 className="text-lg font-semibold text-ink">Book @{handle}</h2>
          <div className="flex gap-1">
            {(["package", "addons", "brief", "confirm"] as Step[]).map((s, i) => (
              <span
                key={s}
                className={`w-2 h-2 rounded-full transition-colors ${
                  step === s ? "bg-ink" : i < ["package","addons","brief","confirm"].indexOf(step) ? "bg-[var(--green)]" : "bg-[var(--paper-2)]"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-6 py-5">
          {/* Step 1: Package selection */}
          {step === "package" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-[var(--muted)] mb-1">Choose a package</p>
              {packages.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => setSelectedPkg(pkg)}
                  className={`w-full text-left rounded-2xl border p-4 transition-all ${
                    selectedPkg?.id === pkg.id
                      ? "border-ink bg-ink text-white"
                      : "border-line bg-white text-ink hover:border-[var(--line-strong)]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{pkg.name}</span>
                    <span className="font-semibold">{fmt(pkg.price)}</span>
                  </div>
                  <p className={`text-xs ${selectedPkg?.id === pkg.id ? "text-[var(--muted-dark)]" : "text-[var(--muted)]"}`}>
                    {pkg.delivery_days}d · {pkg.revisions} revision{pkg.revisions !== 1 ? "s" : ""}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Add-ons */}
          {step === "addons" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-[var(--muted)] mb-1">Add extras (optional)</p>
              {addons.length === 0 && (
                <p className="text-sm text-[var(--muted)] text-center py-4">No add-ons available</p>
              )}
              {addons.map((addon) => (
                <button
                  key={addon.key}
                  type="button"
                  onClick={() => toggleAddon(addon.key)}
                  className={`w-full text-left rounded-2xl border p-4 flex items-center justify-between transition-all ${
                    selectedAddons.includes(addon.key)
                      ? "border-ink bg-[rgba(11,11,15,0.04)]"
                      : "border-line bg-white hover:border-[var(--line-strong)]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-none ${
                      selectedAddons.includes(addon.key) ? "border-ink bg-ink" : "border-line"
                    }`}>
                      {selectedAddons.includes(addon.key) && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <span className="text-sm text-ink">{addon.label}</span>
                  </div>
                  <span className="mono text-sm font-medium text-ink">+{fmt(addon.price)}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Brief */}
          {step === "brief" && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-[var(--muted)] mb-1">Share your brief</p>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="Describe your campaign goals, target audience, key messages, and any specific requirements…"
                rows={6}
                className="input resize-none"
              />
              <p className="text-xs text-[var(--muted)]">Optional but recommended — helps the creator deliver exactly what you need.</p>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === "confirm" && selectedPkg && (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-[var(--muted)] mb-1">Order summary</p>

              <div className="card p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink">{selectedPkg.name} package</span>
                  <span className="mono text-sm font-medium">{fmt(selectedPkg.price)}</span>
                </div>
                {addons.filter((a) => selectedAddons.includes(a.key)).map((a) => (
                  <div key={a.key} className="flex items-center justify-between">
                    <span className="text-sm text-[var(--muted)]">{a.label}</span>
                    <span className="mono text-sm text-[var(--muted)]">+{fmt(a.price)}</span>
                  </div>
                ))}
                <div className="border-t border-line pt-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">Total</span>
                  <span className="mono text-base font-bold text-ink">{fmt(total)}</span>
                </div>
              </div>

              <div className="bg-[var(--paper-2)] rounded-xl p-3 text-xs text-[var(--muted)] flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-none mt-0.5">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Your order will be created and a chat thread opened. Align on the brief with the creator first — then fund escrow to kick off the work.
              </div>

              {error && (
                <p className="text-sm text-[var(--brand)] bg-[var(--rose-soft)] rounded-lg px-3 py-2">{error}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3 border-t border-line pt-4">
          {step !== "package" ? (
            <button
              type="button"
              onClick={() => setStep(step === "addons" ? "package" : step === "brief" ? "addons" : "brief")}
              className="btn btn-paper btn-sm"
            >
              Back
            </button>
          ) : <span />}

          {step === "confirm" ? (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? "Creating order…" : `Start booking · ${fmt(total)}`}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(step === "package" ? "addons" : step === "addons" ? "brief" : "confirm")}
              disabled={step === "package" && !selectedPkg}
              className="btn btn-ink disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
