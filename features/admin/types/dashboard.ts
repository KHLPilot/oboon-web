export type Profile = {
  id: string;
  name: string | null;
  email: string;
  phone_number: string | null;
  role: string;
  created_at: string;
  deleted_at: string | null;
  last_sign_in_at?: string | null;
};

export type ReservationRow = {
  id: string;
  status: string;
  scheduled_at: string;
  property?: { id: number; name: string; image_url?: string | null } | null;
  customer?: { id: string; name: string | null; avatar_url?: string | null } | null;
  agent?: { id: string; name: string | null; avatar_url?: string | null } | null;
  customer_avatar_url?: string | null;
  agent_avatar_url?: string | null;
};

export type SettlementSummary = {
  rewardPendingCount: number;
  refundPendingCount: number;
  noShowPendingCount: number;
};

export type SettlementRow = {
  id: string;
  status: string;
  scheduled_at: string;
  scheduled_at_label: string;
  deposit_label: string;
  deposit_tone: "primary" | "success" | "warning" | "danger" | "muted";
  reward_label: string;
  reward_tone: "primary" | "success" | "warning" | "danger" | "muted";
  reason: string;
  property_name: string;
  property_image_url: string | null;
  customer_name: string | null;
  customer_avatar_url: string | null;
  customer_bank_name: string | null;
  customer_bank_account_holder: string | null;
  agent_name: string | null;
  agent_avatar_url: string | null;
  deposit_amount: number;
  refund_amount: number;
};

export type Term = {
  id: string;
  type: string;
  version: number;
  title: string;
  content: string;
  is_active: boolean;
  updated_at: string;
  created_at: string;
};

export type FAQCategory = {
  id: string;
  key: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type FAQItem = {
  id: string;
  categoryId: string;
  categoryKey: string;
  categoryName: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
};

export type FAQEditor = {
  id?: string;
  categoryId: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
};

export type NoticeCategory = "update" | "service" | "event" | "maintenance";

export type NoticeAdminItem = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: NoticeCategory;
  is_pinned: boolean;
  is_maintenance: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NoticeEditor = {
  id?: number;
  title: string;
  summary: string;
  content: string;
  category: NoticeCategory;
  isPinned: boolean;
  isMaintenance: boolean;
  isPublished: boolean;
  publishedAt: string;
};

export type AppraisalKind = "apartment" | "officetel";

export type AppraisalResultRow = {
  id: string;
  kind: AppraisalKind;
  name: string;
  road_address: string | null;
  jibun_address: string | null;
  lat: number;
  lng: number;
  distance_m: number | null;
  place_url: string | null;
  category_name: string | null;
  detail: {
    complex_name: string | null;
    location: string | null;
    use_approval_date: string | null;
    use_approval_date_is_estimated: boolean;
    age_years: number | null;
    exclusive_area_min_m2: number | null;
    exclusive_area_max_m2: number | null;
    source: {
      kakao: boolean;
      internal_db: boolean;
      public_data: boolean;
    };
    matched_property_id: number | null;
    match_score: number | null;
  };
};
