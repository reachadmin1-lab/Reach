"use client";

import { useState } from "react";

export function BookingLinkBlock({ handle }: { handle: string }) {
  const bookingUrl = `https://reach.app/@${handle}`;
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: `Book @${handle} on Reach`, url: bookingUrl });
    } else {
      handleCopy();
    }
  }

  const qrUrl = `${process.env.NEXT_PUBLIC_API_URL}/creators/${handle}/qr`;

  return (
    <section className="card p-6">
      <h2 className="text-lg font-semibold text-ink mb-4">Booking link</h2>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* QR code */}
        <div className="w-28 h-28 rounded-xl border border-line overflow-hidden bg-[var(--paper-2)] flex-none flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt={`QR code for ${bookingUrl}`}
            className="w-full h-full object-contain p-2"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        {/* URL + actions */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div className="flex items-center gap-2 bg-[var(--paper-2)] rounded-xl px-4 py-3 border border-line">
            <span className="mono text-sm text-ink truncate flex-1">{bookingUrl}</span>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCopy}
              className="btn btn-ink btn-sm gap-2"
            >
              {copied ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 7l3 3 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  Copy link
                </>
              )}
            </button>

            <a
              href={qrUrl}
              download={`reach-${handle}-qr.png`}
              className="btn btn-paper btn-sm gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download QR
            </a>

            <button
              type="button"
              onClick={handleShare}
              className="btn btn-paper btn-sm gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Share
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
