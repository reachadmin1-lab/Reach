"use client";

import { useState, useRef } from "react";
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
        title="Build your portfolio"
        subtitle="Show brands your best work. Add at least one item."
      />

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 pb-6 flex flex-col gap-5">
        {/* Upload zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
            dragOver ? "border-brand bg-[rgba(255,65,24,0.04)]" : "border-line hover:border-[var(--line-strong)]"
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-[var(--paper-2)] flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--muted)]">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-ink">
              {uploading ? "Uploading…" : "Drop files here or click to browse"}
            </p>
            <p className="text-xs text-[var(--muted)] mt-0.5">
              JPG, PNG, MP4, MOV, PDF — up to 100MB each
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {items.map((item) => (
              <div key={item.id} className="relative group rounded-xl overflow-hidden border border-line bg-[var(--paper-2)] aspect-square">
                {item.thumbnail_url ? (
                  <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-3">
                    <span className="text-2xl">
                      {item.kind === "video" ? "🎬" : item.kind === "pdf" ? "📄" : item.kind === "link" ? "🔗" : "🖼️"}
                    </span>
                    <p className="text-xs text-[var(--muted)] text-center truncate w-full">{item.title}</p>
                  </div>
                )}

                {/* Kind badge */}
                <span className="absolute top-2 left-2 pill dark text-[10px] h-5 px-2">
                  {KIND_LABELS[item.kind]}
                </span>

                {/* Remove button */}
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

                {item.meta && (
                  <span className="absolute bottom-2 left-2 mono text-[10px] bg-black/40 text-white px-1.5 py-0.5 rounded">
                    {item.meta}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <StepFooter
        backHref="/onboarding/genres"
        onContinue={handleContinue}
        continueDisabled={items.length === 0}
        loading={uploading}
      />
    </div>
  );
}
