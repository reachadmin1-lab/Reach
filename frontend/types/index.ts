export type UserRole = "creator" | "brand" | "admin";

export interface User {
  id: string;
  email: string;
  phone?: string;
  role: UserRole;
  handle?: string;
  display_name?: string;
  avatar_url?: string;
}

export interface CreatorProfile {
  id: string;
  user_id: string;
  bio?: string;
  cover_url?: string;
  status: "draft" | "under_review" | "active" | "rejected" | "suspended";
  location?: string;
  languages: string[];
  genres: string[];
  platforms: Record<string, string>;
  total_reach?: number;
  avg_engagement?: number;
  on_time_rate?: number;
  brands_count: number;
}

export interface Package {
  id: string;
  creator_id: string;
  tier: "basic" | "standard" | "premium" | "campaign";
  name: string;
  price: number; // paise
  deliverables: string[];
  revisions: number;
  delivery_days: number;
  usage_rights: "personal" | "commercial";
  analytics: boolean;
  is_active: boolean;
}

export interface Order {
  id: string;
  order_ref: string;
  creator_id: string;
  brand_id: string;
  package_id: string;
  brief?: string;
  amount: number;
  platform_fee: number;
  creator_payout: number;
  status:
    | "pending_payment"
    | "escrow_funded"
    | "in_progress"
    | "awaiting_signoff"
    | "delivered"
    | "released"
    | "disputed"
    | "cancelled"
    | "payment_failed";
  created_at: string;
}

export interface Message {
  id: string;
  order_id: string;
  sender_id?: string;
  kind: "text" | "file" | "system";
  content?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  is_read: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  kind: string;
  title: string;
  body?: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}
