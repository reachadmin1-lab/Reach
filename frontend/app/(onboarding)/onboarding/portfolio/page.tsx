"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StepHeader } from "@/components/onboarding/StepHeader";
import { StepFooter } from "@/components/onboarding/StepFooter";
import { api } from "@/lib/api/client";

interface PortfolioItem {
  id: string;
  title: string;
  kind: "image" | "video" | "link" | "pdf";
  url: string;
  thumbnail_url?: string;
  meta?: string;
}

const KIND_LABELS: Record<string, string> = {
  image: "Image",
  video: "Video",
  pdf: "PDF",
  link: "Link",
};

export default function PortfolioStep() {
  const router = useRouter();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function hydrateFromBackend() {
      try {
        const existingItems = await api.get<PortfolioItem[]>("/onboarding/portfolio");
        setItems(Array.isArray(existingItems) ? existingItems : []);
      } catch {
        setItems([]);
      }
    }

    void hydrateFromBackend();
  }, []);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);

      // Use raw fetch for multipart — api.post forces JSON content-type
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? "";

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/onboarding/portfolio`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: form,
        }
      );
      if (!res.ok) throw new Error("Upload failed");
      const item: PortfolioItem = await res.json();
      setItems((prev) => [...prev, item]);
    } catch {
      // TODO: show error toast
    } finally {
      setUploading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  }

  async function removeItem(id: string) {
    await api.delete(`/onboarding/portfolio/${id}`);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleContinue() {
    router.push("/onboarding/packages");
  }

  return (
    <div className="flex flex-col flex-1">
      <StepHeader
        step={5}
        total={7}
        title={
          <>
            Show brands what you can <span className="serif text-brand">make.</span>
          </>
        }
        subtitle="Upload your best 6 - 12 pieces. Reels, edits, stills, even a media kit PDF."
      />

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 pb-6 flex flex-col gap-5">
        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 min-h-[164px] flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors ${
            dragOver ? "border-brand bg-[rgba(255,65,24,0.04)]" : "border-line hover:border-[var(--line-strong)]"
          }`}
        >
          <div className="w-11 h-11 rounded-xl bg-ink flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.7">
              <path d="M12 5v12" />
              <path d="m7 10 5-5 5 5" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-ink">
              {uploading ? "Uploading..." : "Drag & drop or click to add work"}
            </p>
            <p className="text-[10px] uppercase tracking-[0.1em] mono text-[var(--muted)] mt-2">
              JPG · PNG · MP4 · MOV · PDF · YOUTUBE / IG LINK
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,video/mp4,video/quicktime,application/pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Portfolio grid */}
        {items.length > 0 && (
          <>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[11px] uppercase tracking-[0.1em] mono text-[var(--muted)]">
                Your portfolio · {items.length} items
              </p>
              <p className="text-[11px] uppercase tracking-[0.1em] mono text-[var(--muted)]">Drag to reorder</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {items.map((item) => (
              <div key={item.id} className="relative group rounded-2xl overflow-hidden border border-line bg-[var(--paper-2)] min-h-[230px]">
                <div className="h-[76%] relative">
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-start justify-between p-3 bg-[linear-gradient(135deg,rgba(11,11,15,0.12),rgba(11,11,15,0.05))]">
                      <span className="pill dark text-[10px] h-5 px-2">
                        {KIND_LABELS[item.kind].toLowerCase()}
                      </span>
                      <span />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>

                <div className="h-[24%] bg-white px-3 py-2 flex flex-col justify-center">
                  <p className="text-sm text-ink truncate">{item.title}</p>
                  {item.meta && (
                    <span className="mono text-[10px] text-[var(--muted)] mt-1">{item.meta}</span>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="min-h-[230px] rounded-2xl border-2 border-dashed border-line text-[var(--muted)] hover:border-[var(--line-strong)] transition-colors flex flex-col items-center justify-center gap-2"
            >
              <span className="text-2xl leading-none">+</span>
              <span className="text-sm">Add another</span>
            </button>
            </div>
          </>
        )}
      </div>

      <StepFooter
        backHref="/onboarding/genres"
        onContinue={handleContinue}
        continueDisabled={items.length === 0}
        continueLabel="Continue →"
        loading={uploading}
      />
    </div>
  );
}
