// Shapes returned by the County Green API (see the Meraqui Partner CRM API reference).
export type Paginated<T> = { current_page: number; data: T[]; last_page: number; per_page: number; total: number };
export type Envelope<T> = { status: boolean; message: string; data: T };

export type ApiPartnerType = "channel_partner" | "broker" | "influencer" | "freelancer";

export type PartnerDocument = { id: number; document_type: string; file_path: string; original_name: string; status: string; remarks?: string | null };
export type PartnerProfile = {
  id: number;
  partner_type: ApiPartnerType;
  knows_employee?: boolean | string;
  employee_name?: string | null;
  company_name?: string | null;
  business_type?: string | null;
  facebook_link?: string | null;
  instagram_link?: string | null;
  youtube_link?: string | null;
  status?: "pending" | "completed";
  documents?: PartnerDocument[];
};

export type User = {
  id: number;
  name: string;
  email?: string | null;
  mobile: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  profile_photo?: string | null;
  user_type: "backoffice" | "frontend";
  role_id?: number;
  status?: boolean;
  role?: { id: number; name: string; slug: string; user_type: string } | null;
  partner_profile?: PartnerProfile | null;
  created_at?: string;
};
export type ProfileStats = { enquiries: number; site_visits: number; bookings: number };

export type LeadRow = { id: number; full_name: string; mobile: string; email?: string | null; project_name?: string | null; source?: string | null; status: string; lead_type?: string };
export type LeadDetail = LeadRow & {
  unit_category?: string | null;
  lead_type?: string | null;
  next_follow_up?: string | null;
  budget?: string | null;
  assigned_to?: string | null;
  visit_date?: string | null;
  visit_time?: string | null;
  remarks?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  history?: { date: string; activity: string; user_name: string }[];
};

export type VisitRow = { id: number; visitor_name: string; project_name?: string | null; visit_date: string; visit_time?: string | null; visit_end_time?: string | null; status: string; visit_type?: string | null };
export type VisitDetail = VisitRow & { mobile?: string | null; email?: string | null; lead_type?: string | null; booked_by?: string | null; assigned_to?: string | null; remarks?: string | null };

export type Option = { id: number | string; name: string };
export type TimeSlot = { id: number; formatted_slot: string; start_time: string; end_time: string };
export type CpDocument = { id: number; name: string; field_key: string; is_mandatory: boolean };
export type Reference = { id: number; name: string; mobile: string; registration_type?: string; display_text?: string };

export type Project = {
  id: number;
  name: string;
  short_description?: string | null;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  amenities?: string[] | null;
  highlights?: (string | { title?: string; description?: string })[] | null;
  type?: string | null;
  units_count?: number | null;
  towers_count?: number | null;
  possession_date?: string | null;
  status?: string | null;
  rera_number?: string | null;
  logo_url?: string | null;
  image_url?: string | null;
  brochure_url?: string | null;
  configuration_pricing?: { category: string; area: string; area_unit: string; starting_price: string; formatted_price: string }[];
};
export type Tower = { id: number; project_id: number; tower: string; name: string; inventories_count?: number };
export type InventoryCategory = { id: number; name: string; inventories_count?: number; display_area?: string | null };

export type NewsItem = { id: number; title: string; short_description?: string | null; content?: string | null; highlights?: { title: string; description: string }[] | null; image_url?: string | null; category: string; publish_date?: string | null };
export type ProjectDocuments = { id: number; name: string; location?: string; logo_url?: string | null; documents: DocumentItem[] };
export type DocumentItem = { id: number; title: string; category: string; file_extension: string; file_size: string; file_url: string; project_name?: string };
export type NotificationItem = { id: number; type: string; title: string; message: string; action_link?: string | null; image_url?: string | null; created_at: string; is_read: boolean };

export type RegistrationRow = { id: number; name: string; partner_type: ApiPartnerType; mobile: string; email?: string | null; registered_date: string };
export type RegistrationDetail = {
  header: { category: string; status: string; submitted_on: string };
  personal_information: Record<string, string>;
  business_information?: Record<string, string>;
  documents_submitted?: { id: number; name: string; original_name: string; status: string; file_url: string }[];
};

// Display labels for API enums.
export const LEAD_STATUS_LABEL: Record<string, string> = {
  new: "New", contacted: "Contacted", follow_up: "Follow-up", visit_scheduled: "Visit Scheduled", visit_completed: "Visit Completed",
  negotiation: "Negotiation", in_progress: "In Progress", booked: "Booked", converted: "Converted", closed: "Closed", expired: "Expired",
};
export const LEAD_LIST_STATUSES = ["new", "contacted", "follow_up", "visit_scheduled", "visit_completed", "negotiation", "booked", "converted", "closed", "expired"];
// "converted" is set by the backend only and is rejected on update.
export const LEAD_UPDATE_STATUSES = ["new", "contacted", "follow_up", "visit_scheduled", "visit_completed", "negotiation", "in_progress"];
export const LEAD_TYPES = ["hot", "warm", "cold"] as const;
export const VISIT_STATUS_LABEL: Record<string, string> = { scheduled: "Scheduled", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled" };
export const VISIT_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"];
export const DATE_FILTERS = { today: "Today", this_week: "This week", this_month: "This month" } as const;
export const NEWS_CATEGORIES: Record<string, string> = { projects: "Projects", construction_updates: "Construction Updates", offers: "Offers", events: "Events" };
export const BUSINESS_TYPES: Record<string, string> = { proprietorship: "Proprietorship", partnership: "Partnership", llp: "LLP", company: "Company", individual: "Individual" };

export const label = (map: Record<string, string>, v?: string | null) => (v ? map[v] ?? v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—");
export const isMasked = (v?: string | null) => !!v && v.includes("*");
