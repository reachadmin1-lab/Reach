export interface PublicPackage {
  id: string;
  tier: "basic" | "standard" | "premium" | "campaign";
  name: string;
  price: number; // paise
  deliverables: string[];
  revisions: number;
  delivery_days: number;
  usage_rights: "personal" | "commercial";
  analytics: boolean;
}

export interface PublicAddon {
  key: string;
  label: string;
  price: number; // paise
}

export interface PublicPortfolioItem {
  id: string;
  title: string;
  kind: "image" | "video" | "link" | "pdf";
  url: string;
  thumbnail_url?: string;
  meta?: string;
  sort_order: number;
}

export interface PublicCreator {
  handle: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  cover_url?: string;
  location?: string;
  languages: string[];
  genres: string[];
  platforms: Record<string, string>;
  total_reach?: number;
  avg_engagement?: number;
  on_time_rate?: number;
  brands_count: number;
  packages: PublicPackage[];
  addons: PublicAddon[];
  portfolio: PublicPortfolioItem[];
}
