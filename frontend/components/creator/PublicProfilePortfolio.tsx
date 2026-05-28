import type { PublicPortfolioItem } from "@/types/creator";

const KIND_ICON: Record<string, string> = {
  image: "🖼️",
  video: "🎬",
  pdf:   "📄",
  link:  "🔗",
};

export function PublicProfilePortfolio({ items }: { items: PublicPortfolioItem[] }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-ink mb-4">Portfolio</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((item) => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative rounded-xl overflow-hidden border border-line bg-[var(--paper-2)] aspect-square block"
          >
            {item.thumbnail_url ? (
              <img
                src={item.thumbnail_url}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
                <span className="text-3xl">{KIND_ICON[item.kind] ?? "📁"}</span>
                <p className="text-xs text-[var(--muted)] text-center line-clamp-2">{item.title}</p>
              </div>
            )}

            {/* Kind badge */}
            <span className="absolute top-2 left-2 pill dark text-[10px] h-5 px-2 capitalize">
              {item.kind}
            </span>

            {/* Meta */}
            {item.meta && (
              <span className="absolute bottom-2 left-2 mono text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">
                {item.meta}
              </span>
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
