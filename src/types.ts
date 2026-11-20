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
  aadhaar_last_four?: string | null;
  history?: LeadHistory[];
};
// type "task" = a follow-up (has id; can be marked complete), "log" = a system entry.
export type LeadHistory = { id?: number; type?: "task" | "log"; date: string; time?: string | null; activity: string; remarks?: string | null; user_name?: string; is_completed?: boolean; completion_remarks?: string | null };

export type VisitRow = { id: number; visitor_name: string; project_name?: string | null; visit_date: string; visit_time?: string | null; visit_end_time?: string | null; status: string; visit_type?: string | null };
export type VisitDetail = VisitRow & { mobile?: string | null; email?: string | null; lead_type?: string | null; booked_by?: string | null; assigned_to?: string | null; remarks?: string | null };

export type Option = { id: number | string; name: string };
export type TimeSlot = { id: number; formatted_slot: string; start_time: string; end_time: string };
export type CpDocument = { id: number; name: string; field_key: string; is_mandatory: boolean };
export type BusinessType = { id: number; name: string; slug: string };
export type StateItem = { id: number; name: string; slug: string };
export type CityItem = { id: number; name: string; slug: string; state_id: number };
// POST /api/visits/fetch-lead — an existing lead found by mobile.
export type FoundLead = { id: number; full_name?: string | null; first_name?: string | null; last_name?: string | null; mobile: string; email?: string | null; address?: string | null; city?: string | null; state?: string | null; project_id?: number | null; lead_type?: string | null; remarks?: string | null; partner_id?: number | null };
// GET /api/inventory — one unit.
export type InventoryUnit = { id: number; tower_id: number; category_id: number; unit_number: string; floor?: string | null; status: string; status_name?: string | null; formatted_area?: string | null; project_tower?: { id: number; tower: string; name?: string | null } | null };
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

// GET /api/promotions — offers, campaigns, incentives and events (events take an RSVP).
export type Promotion = {
  id: number;
  title: string;
  short_description?: string | null;
  description?: string | null;
  benefits?: { title: string; description?: string }[] | null;
  terms?: string | null;
  promotion_type: "offer" | "campaign" | "incentive" | "event" | string;
  tag_name?: string | null;
  start_date?: string | null;
  start_time?: string | null;
  end_date?: string | null;
  end_time?: string | null;
  image_url?: string | null;
  brochure_url?: string | null;
  project?: { id: number; name: string } | null;
  rsvp_status?: RsvpStatus | null;
};
export type RsvpStatus = "attending" | "not_attending" | "maybe";

// Partner requests ("Request for Documents" etc.). Dates are "YYYY-MM-DD HH:mm:ss" in UTC.
export type PartnerRequestType = { id: number; name: string; tat_hours?: number | null };
export type PartnerRequestRow = { id: number; reference_id: string; type: string; inventory?: string | null; status: string; priority: string; is_overdue?: boolean; tat_deadline?: string | null; created_at: string };
export type PartnerRequestDetail = {
  id: number;
  reference_id: string;
  type: string;
  project_name?: string | null;
  unit_number?: string | null;
  status: string;
  priority: string;
  assigned_to?: string | null;
  is_overdue?: boolean;
  tat_deadline?: string | null;
  history?: { id: number; user_name?: string; status: string; remarks?: string | null; attachment?: string | null; date: string }[];
};

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
  negotiation: "Negotiation", booked: "Booked", converted: "Converted", expired: "Expired", lost: "Lost",
};
// List filter: system statuses (set by the server) + the ones staff can set (GET /api/leads/statuses).
export const LEAD_LIST_STATUSES = ["new", "follow_up", "visit_scheduled", "visit_completed", "contacted", "negotiation", "booked", "converted", "expired", "lost"];
// Statuses staff can set (PATCH /api/leads/{id}/status) — fallback when GET /api/leads/statuses fails or is empty.
export const LEAD_SETTABLE_STATUSES = ["contacted", "negotiation", "booked", "expired", "converted", "lost"] as const;
export type LeadSettableStatus = (typeof LEAD_SETTABLE_STATUSES)[number];
export const LEAD_TYPES =["hot", "warm", "cold"] as const;
export const VISIT_STATUS_LABEL: Record<string, string> = { scheduled: "Scheduled", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled" };
export const VISIT_STATUSES = ["scheduled", "in_progress", "completed", "cancelled"];
export const DATE_FILTERS = { today: "Today", this_week: "This week", this_month: "This month", custom: "Custom" } as const;
// FilterSheet date group → GET list params (date_filter, + start_date / end_date for custom).
export const dateParams = (f: Record<string, string>, key = "date") => {
  const df = Object.keys(DATE_FILTERS).find((k) => DATE_FILTERS[k as keyof typeof DATE_FILTERS] === f[key]);
  if (!df) return {};
  if (df !== "custom") return { date_filter: df };
  return f[`${key}_from`] && f[`${key}_to`] ? { date_filter: df, start_date: f[`${key}_from`], end_date: f[`${key}_to`] } : {};
};
export const RSVP_LABEL: Record<RsvpStatus, string> = { attending: "Attending", maybe: "Maybe", not_attending: "Not attending" };
export const REQUEST_STATUS_LABEL: Record<string, string> = { pending: "Pending", in_progress: "In Progress", completed: "Completed", rejected: "Rejected" };
export const REQUEST_STATUSES = ["pending", "in_progress", "completed", "rejected"];
export const REQUEST_PRIORITY_LABEL: Record<string, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
export const NEWS_CATEGORIES: Record<string, string> = { projects: "Projects", construction_updates: "Construction Updates", offers: "Offers", events: "Events" };

export const label = (map: Record<string, string>, v?: string | null) => (v ? map[v] ?? v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "—");
export const isMasked = (v?: string | null) => !!v && v.includes("*");
