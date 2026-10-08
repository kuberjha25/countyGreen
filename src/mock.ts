// Static data mode — serves the whole app without a backend.
// Enabled with EXPO_PUBLIC_STATIC_MODE=1 (or when no backend URL is set). The
// routes below are the REST contract a real backend has to implement.
import { Action, ADMIN_ROLE_ID, can, DEFAULT_ROLES, MODULES, ModuleKey, PARTNER_ALLOWED, PARTNER_ROLE_ID, Role } from "@/src/access";
import type { User } from "@/src/api";
import {
  CATEGORIES, CONFIGURATIONS, DEFAULT_PRODUCTS, DEFAULT_REG_DOCS, DOCUMENT_REQUEST_TYPES, LEAD_SOURCES, LEAD_STATUSES, MASTERS, MasterKey, NEXT_ACTIONS,
  Product, RegDocConfig, regDocsFor, TIME_SLOTS,
} from "@/src/brand";
import { digits, fmtDay, isLast4 } from "@/src/format";
import { storage } from "@/src/utils/storage";

type Doc = Record<string, any>;
const DAY = 86400000;
const now = () => new Date();
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => iso(new Date(Date.now() - n * DAY));
const daysAhead = (n: number) => fmtDay(new Date(Date.now() + n * DAY));
// Same day/month as (today + offset) in the given year — for birthdays / anniversaries.
const onDay = (offset: number, year: number) => {
  const d = new Date(Date.now() + offset * DAY);
  return fmtDay(new Date(year, d.getMonth(), d.getDate()));
};
let seq = 1000;
const id = () => `static-${++seq}`;
const fail = (status: number, message: string) => Object.assign(new Error(message), { status });

const PROJECT = "County Green";
const AMENITIES = [
  { icon: "shield-checkmark-outline", title: "Round the Clock Security", image: "hero-security" },
  { icon: "tennisball-outline", title: "Multiple Sports Arenas & Training Spaces", image: "tennis" },
  { icon: "water-outline", title: "Optimum Greenery & Multiple Water Features", image: "hero-fountain" },
  { icon: "medkit-outline", title: "Convenience Store & Pharmacy", image: "pharmacy" },
  { icon: "people-outline", title: "Amphitheatre for Community Gatherings", image: "amphitheatre" },
  { icon: "leaf-outline", title: "Yoga & Meditation Space", image: "yoga" },
  { icon: "barbell-outline", title: "State of the Art Club House", image: "gym" },
];

const projects: Doc[] = [{
  id: "project-1", name: PROJECT, location: "New Chandigarh", tagline: "Home That Comes With More", status: "Arriving Soon",
  positioning: "First Township from North of Chandigarh", sub_tagline: "Close to the city, away from its chaos", hero_image: "hero-security",
  gallery: ["hero-sunset", "hero-fountain", "amphitheatre", "family-lawn", "festive", "panoramic"],
  intro: "County Green is a township arriving soon in New Chandigarh — a home that comes with more. Positioned as the first township from north of Chandigarh, it is designed to be close to the city, yet away from its chaos: optimum greenery, multiple water features and everyday moments thoughtfully designed.",
  highlights: ["First Township from North of Chandigarh", "Close to the city, away from its chaos", "Optimum greenery & multiple water features", "A township built for young champions", "Forging a sustainable future"],
  amenities: AMENITIES, configuration: "Plots & Independent Floors", price_from: "To be announced", rera_number: "To be announced", possession: "To be announced",
  project_type: "Residential Township", developer: "County Green (placeholder — replace with developer name)", total_area: "To be announced", order: 1,
}];

/* ------------------------------------------------------------------ */
/* Seed data (used until something is saved on the device)            */
/* ------------------------------------------------------------------ */
const defaultContent = (): Record<string, Doc> => ({
  about: {
    key: "about", title: "About County Green", subtitle: "Home That Comes With More", hero_image: "hero-sunset",
    story: "County Green, New Chandigarh, is a township arriving soon — positioned as the first township from north of Chandigarh. It is built on a simple promise: a home that comes with more. Close to the city, yet away from its chaos, County Green brings together optimum greenery, multiple water features and spaces designed for everyday moments — thoughtfully designed, delightfully curated and rightfully planned.",
    pillars: [
      { title: "Everyday Moments", body: "Thoughtfully designed spaces — from quiet mornings in the yoga & meditation space to festive nights at the community amphitheatre." },
      { title: "Built for Champions", body: "A township built for young champions, with multiple sports arenas, training spaces and a state of the art club house." },
      { title: "Sustainable Future", body: "Forging a sustainable future with optimum greenery, water features and an address that feels like an escape." },
    ],
    highlights: ["Arriving Soon · New Chandigarh", "First Township from North of Chandigarh", "Round the Clock Security", "Convenience Store & Pharmacy"],
    company_note: "Company registration, RERA and corporate details are placeholders and will be updated with official County Green information.",
    images: ["golden", "play", "sustainable", "quiet"],
  },
  terms: {
    key: "terms", title: "Terms & Conditions", updated: "01 Jun 2026",
    sections: [
      { title: "1. Introduction", body: "Welcome to the County Green Channel Partner application. By accessing or using the app, you agree to be bound by these Terms & Conditions and all applicable laws and regulations. If you do not agree, please do not use the application. [Placeholder — replace with County Green legal copy.]" },
      { title: "2. Channel Partner Eligibility", body: "Registration as a channel partner is subject to verification of identity, company and RERA documentation submitted through the app. County Green reserves the right to approve, hold or decline applications." },
      { title: "3. Leads & Registrations", body: "Leads and project visits are recorded by authorised County Green staff on behalf of channel partners, brokers, influencers and freelancers, and are governed by County Green's partner policy. Attribution is based on first valid registration and may be subject to verification." },
      { title: "4. Project Information", body: "Project details, products, pricing and availability shown in the app are indicative and subject to change without notice. Please refer to official project documents for confirmed information." },
      { title: "5. Data & Privacy", body: "Personal information collected is used solely to operate the partner programme and is handled in accordance with County Green's privacy policy. Customer leads are identified by the last 4 digits of the mobile and Aadhaar numbers only." },
      { title: "6. Changes to Terms", body: "County Green may update these terms from time to time. Continued use of the application constitutes acceptance of the revised terms." },
    ],
  },
});

const defaultDocuments = (): Doc[] => ([
  ["Project Brochure", "Marketing", "PDF", "8.4 MB"], ["Master Layout Plan", "Technical", "PDF", "4.1 MB"], ["Price List (Placeholder)", "Pricing", "PDF", "1.2 MB"],
  ["Payment Plan (Placeholder)", "Legal", "PDF", "1.0 MB"], ["Channel Partner Agreement", "Legal", "PDF", "0.9 MB"], ["RERA Certificate (To be updated)", "Legal", "PDF", "0.6 MB"],
  ["Amenities Presentation", "Marketing", "PDF", "12.3 MB"], ["Social Media Creative Kit", "Marketing", "ZIP", "45.0 MB"],
] as const).map(([name, category, type, size], i) => ({ id: `doc-${i}`, name, category, type, size, url: "", order: i + 1, updated_at: daysAgo((i + 1) * 3) }));

const defaultNews = (): Doc[] => ([
  ["County Green Arriving Soon in New Chandigarh", "Project Updates", "hero-security", "County Green, positioned as the first township from north of Chandigarh, is arriving soon. Partners can begin registering interest through the app; the County Green team records leads and project visits for you.\n\nThe township is designed to be close to the city, away from its chaos — with optimum greenery, multiple water features and round-the-clock security.\n\nDetailed products, pricing and possession timelines will be shared with partners as they are announced.", 1],
  ["A Township Built for Young Champions", "Announcements", "tennis", "Multiple sports arenas and training spaces form a core part of the County Green experience. From tennis and basketball courts to a state of the art club house, the township is planned so that play has no limits.\n\nPartners can use the amenities presentation in Documents when introducing the project to families with young sportspersons.", 3],
  ["Everyday Moments, Thoughtfully Designed", "Marketing", "everyday-moments", "The latest County Green creative campaign — Everyday Moments — captures quiet mornings, active evenings and festive nights within the township.\n\nThe complete social media creative kit is now available in the Documents section for partner use.", 5],
  ["Partner Meet: Project Walkthrough", "Events", "amphitheatre", "An exclusive walkthrough for channel partners is being planned at the County Green site in New Chandigarh. Dates will be confirmed via notifications.\n\nThe session will cover the master layout, amenities such as the amphitheatre and yoga & meditation space, and the partner registration process.", 8],
  ["Forging a Sustainable Future", "Project Updates", "sustainable", "Optimum greenery and multiple water features are central to County Green's planning. The township is designed as an address that feels like an escape — where every view feels private.", 12],
] as const).map(([title, category, image, body, d], i) => newsDoc({ id: `news-${i}`, title, category, image, body, published_at: daysAgo(d) }));

function newsDoc(n: Doc) {
  const body = String(n.body ?? "");
  return { author: "County Green Sales", ...n, excerpt: body.split("\n")[0].slice(0, 140), read_time: `${Math.max(2, Math.floor(body.length / 400))} min read` };
}

const defaultNotifications = (): Doc[] => ([
  ["Registration Updates", "Registration approved", "Registration CG-REG-2026-0102 for Rohit Mehra has been approved.", false, 0.1],
  ["Lead Updates", "Follow-up due today", "Rajesh Kumar — call scheduled at 11:00 AM.", false, 0.3],
  ["Project Updates", "New creative kit available", "Everyday Moments social media creatives added to Documents.", false, 1.2],
  ["Announcements", "Partner walkthrough being planned", "Site walkthrough for channel partners at New Chandigarh. Dates to follow.", true, 2.0],
  ["System", "Profile verified", "Your channel partner profile has been verified. Welcome to County Green.", true, 4.0],
] as const).map(([category, title, body, read, d], i) => ({ id: `notif-${i}`, category, title, body, read, created_at: daysAgo(d) }));

// County Green staff. Mobile numbers are the demo logins (OTP 111111).
const defaultStaff = (): User[] => ([
  ["Admin", "County Green", "9000000009", ADMIN_ROLE_ID],
  ["Aman", "Verma", "9000000002", "role-sales"],
  ["Harleen", "Kaur", "9000000003", "role-front-office"],
  ["Rohit", "Sharma", "9000000004", "role-sales"],
  ["Simran", "Gill", "9000000005", "role-crm"],
  ["Vikram", "Singh", "9000000006", "role-sales"],
] as const).map(([first_name, last_name, mobile, role_id], i) => ({
  id: `staff-${i}`, kind: "staff", role_id, first_name, last_name, phone: `+91${mobile}`, country_code: "+91", mobile, active: true, profile_step: 4, profile_completed: true, created_at: daysAgo(200),
}));

const uploaded = (type?: string, entity?: string, status = "Verified") => regDocsFor(DEFAULT_REG_DOCS, type, entity).map((d) => ({ type: d.type, status, file_name: `${d.type.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf` }));

// Partner logins (CP / Broker / Influencer / Freelancer). 9000000001 is a ready CP; any other number starts a new registration.
const defaultPartners = (): User[] => [
  { id: "partner-gill", kind: "partner", phone: "+919000000001", country_code: "+91", mobile: "9000000001", partner_type: "Channel Partner", entity_type: "LLP", first_name: "Gurpreet", last_name: "Gill", email: "gurpreet@gillrealty.example.com", company_name: "Gill Realty LLP", experience: "5–10 years", specialisation: "Plots & Land", knows_employee: true, associated_employee: "Aman Verma", city: "Mohali", state: "Punjab", dob: onDay(0, 1986), anniversary: onDay(12, 2012), documents: uploaded("Channel Partner", "LLP"), profile_step: 4, profile_completed: true, created_at: daysAgo(90) },
  { id: "partner-ayesha", kind: "partner", phone: "+919000000012", country_code: "+91", mobile: "9000000012", partner_type: "Influencer", entity_type: "Individual", first_name: "Ayesha", last_name: "Khan", email: "ayesha.khan@example.com", social: { instagram: "https://instagram.com/ayesha_khan", youtube: "https://youtube.com/@ayeshakhan" }, followers: "1 – 5 Lakh", city: "Chandigarh", state: "Chandigarh", dob: onDay(3, 1994), documents: uploaded("Influencer"), profile_step: 4, profile_completed: true, created_at: daysAgo(60) },
  { id: "partner-karan", kind: "partner", phone: "+919000000013", country_code: "+91", mobile: "9000000013", partner_type: "Freelancer", entity_type: "Individual", first_name: "Karan", last_name: "Bedi", email: "karan.bedi@example.com", experience: "2–5 years", specialisation: "Residential", city: "Panchkula", state: "Haryana", dob: onDay(40, 1990), anniversary: onDay(0, 2015), documents: uploaded("Freelancer"), profile_step: 4, profile_completed: true, created_at: daysAgo(45) },
  { id: "partner-rohit", kind: "partner", phone: "+919000000014", country_code: "+91", mobile: "9000000014", partner_type: "Broker", entity_type: "Proprietorship", first_name: "Rohit", last_name: "Mehra", email: "rohit.mehra@example.com", company_name: "Mehra Properties", experience: "10+ years", specialisation: "Residential", knows_employee: true, associated_employee: "Vikram Singh", city: "Zirakpur", state: "Punjab", dob: onDay(6, 1989), documents: uploaded("Broker", "Proprietorship"), profile_step: 4, profile_completed: true, created_at: daysAgo(120) },
];

const defaultRegistrations = (): Doc[] => ([
  ["Ayesha", "Khan", "Influencer", "+91 90000 00012", "Chandigarh", "Chandigarh", "Completed", 60],
  ["Rohit", "Mehra", "Broker", "+91 90000 00014", "Zirakpur", "Punjab", "Completed", 120],
  ["Neha", "Iyer", "Channel Partner", "+91 99887 76655", "Mohali", "Punjab", "Pending", 1],
  ["Karan", "Bedi", "Freelancer", "+91 90000 00013", "Panchkula", "Haryana", "Completed", 45],
] as const).map(([first_name, last_name, category, mobile, city, state, status, d], i) => ({
  id: `reg-${i}`, registration_no: `CG-REG-2026-${String(101 + i).padStart(4, "0")}`, first_name, last_name, category, mobile, email: `${first_name.toLowerCase()}.${last_name.toLowerCase()}@example.com`,
  city, state, address: `${12 + i}, Sector ${40 + i}`, pincode: "160001", company: category === "Broker" || category === "Channel Partner" ? `${last_name} Realty` : "", project: PROJECT, status, notes: "",
  documents: uploaded(category, undefined, status === "Completed" ? "Verified" : "Under Review"),
  social: category === "Influencer" ? { instagram: `https://instagram.com/${first_name.toLowerCase()}_${last_name.toLowerCase()}`, youtube: `https://youtube.com/@${first_name.toLowerCase()}${last_name.toLowerCase()}` } : {},
  created_at: daysAgo(d),
}));

const PARTNER_SEED: Record<string, [string, string]> = {
  "partner-gill": ["Channel Partner", "Gurpreet Gill (Gill Realty LLP)"],
  "partner-ayesha": ["Influencer", "Ayesha Khan"],
  "partner-karan": ["Freelancer", "Karan Bedi"],
  "partner-rohit": ["Broker", "Rohit Mehra (Mehra Properties)"],
};
const SALES = ["staff-1", "staff-3", "staff-5"];
const staffName = (sid: string) => ({ "staff-1": "Aman Verma", "staff-2": "Harleen Kaur", "staff-3": "Rohit Sharma", "staff-4": "Simran Gill", "staff-5": "Vikram Singh" })[sid] ?? "";

const defaultLeads = (): Doc[] => ([
  // name, partner (null = direct), full mobile (direct only), mobile last4, aadhaar last4, category, source, status, temp, config, city, days ago
  ["Rajesh Kumar", "partner-gill", "", "3210", "4821", "Individual", "Walk-in", "In Progress", "Hot", "3 BHK", "Chandigarh", 1],
  ["Priya Sharma", "partner-rohit", "", "2109", "7710", "Individual", "Reference", "In Progress", "Warm", "4 BHK", "Mohali", 2],
  ["Amit Patel", "partner-gill", "", "1098", "3392", "Corporate", "Reference", "Converted", "Hot", "Plot", "Ludhiana", 5],
  ["Sneha Desai", "partner-ayesha", "", "0987", "5561", "Individual", "Social Media", "In Progress", "Cold", "Plot", "Panchkula", 7],
  ["Vikas Malhotra", "partner-karan", "", "9876", "2245", "NRI", "Reference", "Not Matured", "Cold", "Villa", "Delhi", 12],
  ["Meera Joshi", "partner-rohit", "", "8765", "6604", "Individual", "Exhibition", "Converted", "Warm", "3 BHK", "Zirakpur", 15],
  ["Nitin Arora", null, "+91 98140 11223", "", "", "Individual", "Website", "In Progress", "Warm", "Plot", "Kharar", 3],
  ["Kavya Menon", null, "+91 98720 44556", "", "", "Investor", "Social Media", "In Progress", "Hot", "Plot", "Chandigarh", 0],
] as const).map(([full_name, pid, mobile, mobile_last4, aadhaar_last4, category, source, status, temperature, configuration, city, d], i) => {
  const sid = SALES[i % SALES.length];
  const [partner_type, partner_name] = pid ? PARTNER_SEED[pid] : [null, ""];
  return {
    id: `lead-${i}`, full_name, mobile, mobile_last4, aadhaar_last4, partner_id: pid, partner_type, partner_name, assigned_to: staffName(sid), assigned_to_id: sid, created_by: "Harleen Kaur",
    document_requests: [] as Doc[], email: pid ? "" : `${full_name.split(" ")[0].toLowerCase()}@example.com`, category, source, status, temperature, configuration, city, state: "Punjab",
    project: PROJECT, budget: "To be discussed", address: "", notes: "Interested in the township launch. Shared brochure and amenities deck.",
    follow_up_date: daysAhead((i % 4) + 1), follow_up_time: "11:00 AM", next_action: "Schedule project visit", created_at: daysAgo(d), updated_at: daysAgo(Math.max(0, d - 1)),
    history: [
      { title: `Status → ${status}`, detail: "Updated after client discussion", at: daysAgo(Math.max(0, d - 1)) },
      { title: "Brochure shared", detail: "Project brochure and amenities presentation sent on WhatsApp", at: daysAgo(d - 0.1) },
      { title: "Lead Created", detail: pid ? `Added by Harleen Kaur on behalf of ${partner_name}` : `Lead captured via ${source}`, at: daysAgo(d) },
    ],
  };
});

const defaultVisits = (): Doc[] => ([
  ["Rahul Kapoor", "partner-gill", "", "4410", "1029", "In Progress", 0, "11:00 AM"],
  ["Priya Nair", "partner-ayesha", "", "2109", "8834", "In Progress", 1, "02:00 PM"],
  ["Vikas Malhotra", "partner-karan", "", "9876", "2245", "Attended", -2, "11:00 AM"],
  ["Meera Joshi", "partner-rohit", "", "8765", "6604", "Attended", -4, "04:00 PM"],
  ["Arjun Malhotra", null, "+91 90000 11111", "", "", "Attended", -6, "12:00 PM"],
] as const).map(([full_name, pid, mobile, mobile_last4, aadhaar_last4, status, d, visit_time], i) => {
  const sid = SALES[(i + 1) % SALES.length];
  const [partner_type, partner_name] = pid ? PARTNER_SEED[pid] : [null, ""];
  return {
    id: `visit-${i}`, full_name, mobile, mobile_last4, aadhaar_last4, partner_id: pid, partner_type, partner_name, assigned_to: staffName(sid), assigned_to_id: sid, created_by: "Harleen Kaur",
    email: "", visitor_type: "Client", status, project: PROJECT, visit_date: daysAhead(d), visit_time, city: "Chandigarh", state: "Punjab", address: "",
    notes: "Client keen to see the site layout, club house and green areas.", follow_up: "Share price list once announced", created_at: daysAgo(Math.max(1, Math.abs(d))),
    history: [{ title: "Visit scheduled", detail: `${visit_time} · by Harleen Kaur`, at: daysAgo(Math.max(1, Math.abs(d)) + 1) }, ...(status === "Attended" ? [{ title: "Visit attended", detail: "Walkthrough completed", at: daysAgo(-d) }] : [])],
  };
});

const defaultAvailability = (): Doc[] => [
  { id: "avail-0", product_id: "prod-500", product_name: "500 Sq. Yards", partner_id: "partner-gill", partner_name: "Gurpreet Gill (Gill Realty LLP)", partner_type: "Channel Partner", partner_mobile: "+919000000001", customer_name: "Rajesh Kumar", notes: "East facing preferred.", requested_by: "Gurpreet Gill", assigned_to: "Aman Verma", assigned_to_id: "staff-1", status: "Pending", response: "", created_at: daysAgo(1), updated_at: daysAgo(1), history: [{ title: "Availability requested", detail: "500 Sq. Yards", at: daysAgo(1) }] },
  { id: "avail-1", product_id: "prod-if-350", product_name: "Independent Floor – 350 Sq. Yards", partner_id: "partner-ayesha", partner_name: "Ayesha Khan", partner_type: "Influencer", partner_mobile: "+919000000012", customer_name: "", notes: "", requested_by: "Ayesha Khan", assigned_to: "Rohit Sharma", assigned_to_id: "staff-3", status: "Available", response: "Ground and first floors available in Phase 1.", created_at: daysAgo(4), updated_at: daysAgo(3), history: [{ title: "Marked Available", detail: "Ground and first floors available in Phase 1.", at: daysAgo(3) }, { title: "Availability requested", detail: "Independent Floor – 350 Sq. Yards", at: daysAgo(4) }] },
];

const defaultMasters = (): Record<MasterKey | "next_actions" | "document_request_types", string[]> => ({
  customer_categories: [...CATEGORIES], configurations: [...CONFIGURATIONS], lead_sources: [...LEAD_SOURCES], time_slots: [...TIME_SLOTS], next_actions: [...NEXT_ACTIONS], document_request_types: [...DOCUMENT_REQUEST_TYPES],
});

/* ------------------------------------------------------------------ */
/* State (saved on the device so it survives restarts)               */
/* ------------------------------------------------------------------ */
let users: User[] = [...defaultStaff(), ...defaultPartners()];
let currentId: string | null = null;
let registrations = defaultRegistrations();
let leads = defaultLeads();
let visits = defaultVisits();
let notifications = defaultNotifications();
let roles: Role[] = DEFAULT_ROLES.map((r) => ({ ...r, permissions: { ...r.permissions } }));
let masters = defaultMasters();
let regDocs: RegDocConfig[] = DEFAULT_REG_DOCS.map((d) => ({ ...d, rules: { ...d.rules } }));
let products: Product[] = DEFAULT_PRODUCTS.map((p) => ({ ...p }));
let availability = defaultAvailability();
let documents = defaultDocuments();
let news = defaultNews();
let content = defaultContent();
let whatsappLog: Doc[] = [];
let assignSeq = 0;

const DB_KEY = "cg_static_db_v2";
let loading: Promise<void> | null = null;
function loadDb() {
  loading ??= (async () => {
    const raw = await storage.getItem<string | null>(DB_KEY, null);
    if (!raw) return;
    try {
      const db = JSON.parse(raw);
      const arr = <T,>(v: unknown, fallback: T[]): T[] => (Array.isArray(v) ? (v as T[]) : fallback);
      users = arr(db.users, users);
      currentId = typeof db.currentId === "string" ? db.currentId : null;
      registrations = arr(db.registrations, registrations);
      leads = arr(db.leads, leads);
      visits = arr(db.visits, visits);
      notifications = arr(db.notifications, notifications);
      roles = arr(db.roles, roles);
      regDocs = arr(db.regDocs, regDocs);
      products = arr(db.products, products);
      availability = arr(db.availability, availability);
      documents = arr(db.documents, documents);
      news = arr(db.news, news);
      whatsappLog = arr(db.whatsappLog, whatsappLog);
      if (db.masters && typeof db.masters === "object") masters = { ...masters, ...db.masters };
      if (db.content && typeof db.content === "object") content = { ...content, ...db.content };
      if (typeof db.seq === "number") seq = Math.max(seq, db.seq);
      if (typeof db.assignSeq === "number") assignSeq = db.assignSeq;
    } catch {
      // Corrupt snapshot: start again from the sample data.
    }
  })();
  return loading;
}
const saveDb = () =>
  storage.setItem(DB_KEY, JSON.stringify({ users, currentId, registrations, leads, visits, notifications, roles, masters, regDocs, products, availability, documents, news, content, whatsappLog, seq, assignSeq }));

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
const byId = <T extends Record<string, any>>(arr: T[], id_: string): T => {
  const d = arr.find((x) => x.id === id_);
  if (!d) throw fail(404, "Not found");
  return d;
};
const sortDesc = (arr: Doc[], key: string) => [...arr].sort((a, b) => (a[key] < b[key] ? 1 : -1));
const nameOf = (u?: User | null) => `${u?.first_name ?? ""} ${u?.last_name ?? ""}`.trim();
const last10 = (v?: string) => digits(v).slice(-10);
const MODULE_LABEL = Object.fromEntries(MODULES.map((m) => [m.key, m.label])) as Record<ModuleKey, string>;

function roleOf(u: User): Role | undefined {
  return roles.find((r) => r.id === (u.kind === "staff" ? u.role_id : PARTNER_ROLE_ID));
}

// The user as the app sees it: with role name and resolved permissions.
function withPerms(u: User): User {
  const role = roleOf(u);
  let permissions = role?.permissions ?? {};
  if (u.kind === "staff" && u.role_id === ADMIN_ROLE_ID) permissions = Object.fromEntries(MODULES.map((m) => [m.key, [...m.actions]]));
  if (u.kind !== "staff") permissions = Object.fromEntries(Object.entries(permissions).map(([k, acts]) => [k, (acts ?? []).filter((a) => (PARTNER_ALLOWED[k as ModuleKey] ?? []).includes(a))]));
  return { ...u, kind: u.kind ?? "partner", role_name: role?.name ?? (u.kind === "staff" ? "Staff" : "Partner"), permissions };
}

function me(): User {
  const u = users.find((x) => x.id === currentId);
  if (!u) throw fail(401, "Please log in again.");
  return withPerms(u);
}
const isStaffUser = (u: User) => u.kind === "staff";

function guard(module: ModuleKey, action: Action) {
  const u = me();
  if (!can(u, module, action)) throw fail(403, `Your role (${u.role_name}) cannot ${action} in ${MODULE_LABEL[module]}. Ask Admin to update Role Management.`);
  return u;
}

// Partners only ever see their own leads, visits and availability requests.
const scoped = <T extends Doc>(arr: T[]): T[] => {
  const u = me();
  return isStaffUser(u) ? arr : arr.filter((x) => x.partner_id === u.id);
};

function partnerDirectory() {
  const list: Doc[] = users
    .filter((u) => u.kind !== "staff" && u.profile_completed)
    .map((u) => ({ id: u.id, name: nameOf(u) || u.phone, partner_type: u.partner_type ?? "Channel Partner", mobile: u.phone, company: u.company_name ?? "", dob: u.dob ?? "", anniversary: u.anniversary ?? "", associated_employee: u.associated_employee ?? "" }));
  const known = new Set(list.map((p) => last10(p.mobile)));
  registrations.forEach((r) => {
    if (known.has(last10(r.mobile))) return;
    known.add(last10(r.mobile));
    list.push({ id: r.id, name: `${r.first_name} ${r.last_name}`.trim(), partner_type: r.category, mobile: r.mobile, company: r.company ?? "", dob: r.dob ?? "", anniversary: r.anniversary ?? "", associated_employee: "" });
  });
  return list.sort((a, b) => a.name.localeCompare(b.name));
}
const partnerLabel = (p: Doc) => (p.company ? `${p.name} (${p.company})` : p.name);

const activeStaff = () => users.filter((u) => u.kind === "staff" && u.active !== false);
function pickStaff(staffId?: string, preferredName?: string): User {
  const pool = activeStaff();
  if (staffId) {
    const s = pool.find((u) => u.id === staffId);
    if (!s) throw fail(422, "Select an active staff member.");
    return s;
  }
  const preferred = preferredName ? pool.find((u) => nameOf(u) === preferredName) : undefined;
  if (preferred) return preferred;
  const sales = pool.filter((u) => u.role_id !== ADMIN_ROLE_ID);
  const list = sales.length ? sales : pool;
  return list[assignSeq++ % list.length];
}

// Customer identification for a lead / visit. Partner leads: last 4 digits of the
// mobile and Aadhaar only (no full number, no email). Direct leads: full mobile.
function identify(body: Doc, existing?: Doc) {
  const partnerId = body.partner_id !== undefined ? body.partner_id : existing?.partner_id;
  if (partnerId) {
    const p = partnerDirectory().find((x) => x.id === partnerId);
    if (!p) throw fail(422, "Select the CP / Broker / Influencer / Freelancer who brought this customer.");
    const mobile_last4 = body.mobile_last4 ?? existing?.mobile_last4;
    const aadhaar_last4 = body.aadhaar_last4 ?? existing?.aadhaar_last4;
    if (!isLast4(mobile_last4)) throw fail(422, "Enter the last 4 digits of the customer's mobile number.");
    if (!isLast4(aadhaar_last4)) throw fail(422, "Enter the last 4 digits of the customer's Aadhaar number.");
    return { partner_id: p.id, partner_type: p.partner_type, partner_name: partnerLabel(p), mobile: "", mobile_last4, aadhaar_last4, _partner: p };
  }
  const mobile = body.mobile ?? existing?.mobile ?? "";
  if (digits(mobile).length < 10) throw fail(422, "Enter a valid 10-digit mobile number.");
  return { partner_id: null, partner_type: null, partner_name: "", mobile, mobile_last4: "", aadhaar_last4: "", _partner: null as Doc | null };
}

const notify = (category: string, title: string, body: string) => notifications.unshift({ id: id(), category, title, body, read: false, created_at: iso(now()) });
const clean = (b: Doc) => Object.fromEntries(Object.entries(b).filter(([k, v]) => v !== undefined && !k.startsWith("_")));

const LEAD_MODIFY_FIELDS = ["status", "temperature", "follow_up_date", "follow_up_time", "next_action", "notes"];
const LEAD_EDIT_FIELDS = ["full_name", "mobile", "mobile_last4", "aadhaar_last4", "email", "category", "configuration", "budget", "source", "address", "city", "state", "project", "partner_id"];

/* ------------------------------------------------------------------ */
/* Router                                                             */
/* ------------------------------------------------------------------ */
// Demo data for partner logins: every partner (not just the seeded CP) gets their own
// copy of the sample leads (incl. converted), project visits and availability requests,
// so My Leads / Converted / Visits are never empty in the static build. Runs once per partner.
function seedPartnerDemo(): boolean {
  const u = users.find((x) => x.id === currentId) as (User & { demo_seeded?: boolean }) | undefined;
  if (!u || u.kind === "staff" || !u.profile_completed || u.demo_seeded) return false;
  u.demo_seeded = true;
  if (leads.some((l) => l.partner_id === u.id)) return true;
  const name = nameOf(u) || u.phone;
  const label = u.company_name ? `${name} (${u.company_name})` : name;
  const stamp = <T extends Doc>(d: T): T => ({ ...d, id: id(), partner_id: u.id, partner_type: u.partner_type ?? "Channel Partner", partner_name: label });
  const ownHistory = (h: Doc[]) => h.map((e) => ({ ...e, detail: String(e.detail ?? "").replace(/on behalf of .*$/, `on behalf of ${label}`) }));
  leads.push(...defaultLeads().filter((l) => l.partner_id).map((l) => ({ ...stamp(l), history: ownHistory(l.history) })));
  visits.push(...defaultVisits().filter((v) => v.partner_id).map(stamp));
  availability.push(...defaultAvailability().map((a) => ({ ...stamp(a), partner_mobile: u.phone, requested_by: name })));
  return true;
}

export async function mockRequest(method: string, path: string, body?: any): Promise<any> {
  await new Promise((r) => setTimeout(r, 120)); // feel like a network call
  await loadDb();
  if (seedPartnerDemo()) await saveDb();
  const result = await handle(method, path, body ?? {});
  if (method !== "GET") await saveDb();
  return result;
}

async function handle(method: string, path: string, body: Doc): Promise<any> {
  const [route, qs = ""] = path.split("?");
  const q = Object.fromEntries(new URLSearchParams(qs));
  const m = (re: RegExp) => route.match(re);
  let g: RegExpMatchArray | null;

  /* ---------- auth ---------- */
  if (route === "/auth/request-otp") return { message: "OTP sent", expires_in: 300, demo_hint: "Use OTP 111111 in demo mode" };
  if (route === "/auth/verify-otp") {
    if (body.otp !== "111111") throw fail(401, "The code you entered is incorrect.");
    const phone = `${body.country_code}${digits(body.phone)}`;
    let u = users.find((x) => digits(x.phone) === digits(phone));
    if (u && u.kind === "staff" && u.active === false) throw fail(403, "This staff login has been deactivated by Admin.");
    if (!u) {
      u = { id: id(), kind: "partner", phone, country_code: body.country_code, mobile: digits(body.phone), profile_step: 0, profile_completed: false, created_at: iso(now()) };
      users.push(u);
    }
    currentId = u.id;
    return { access_token: `static-${u.id}`, token_type: "bearer", user: withPerms(u) };
  }
  if (route === "/me") {
    const u = me();
    if (method === "PUT") {
      // Role, permissions and the verified number cannot be changed from the profile.
      const rest = Object.fromEntries(Object.entries(body).filter(([k]) => !["kind", "role_id", "role_name", "permissions", "id", "phone", "active"].includes(k)));
      Object.assign(users.find((x) => x.id === u.id)!, rest);
    }
    return me();
  }

  /* ---------- people ---------- */
  if (route === "/employees") return activeStaff().map((u) => ({ id: u.id, name: nameOf(u), role_id: u.role_id, role_name: roles.find((r) => r.id === u.role_id)?.name ?? "Staff", phone: u.phone, active: true }));
  if (route === "/partners") {
    me();
    return partnerDirectory();
  }
  if (route === "/staff") {
    if (method === "POST") {
      guard("roles", "add");
      const mobile = digits(body.mobile);
      if (!String(body.first_name ?? "").trim()) throw fail(422, "Name is required.");
      if (mobile.length !== 10) throw fail(422, "Enter a valid 10-digit mobile number.");
      if (users.some((u) => last10(u.phone) === mobile)) throw fail(409, "This mobile number is already registered.");
      if (!roles.some((r) => r.id === body.role_id && r.kind === "staff")) throw fail(422, "Select a staff role.");
      const s: User = { id: id(), kind: "staff", role_id: body.role_id, first_name: String(body.first_name).trim(), last_name: String(body.last_name ?? "").trim(), phone: `+91${mobile}`, country_code: "+91", mobile, active: true, profile_step: 4, profile_completed: true, created_at: iso(now()) };
      users.push(s);
      return withPerms(s);
    }
    guard("roles", "view");
    return users.filter((u) => u.kind === "staff").map(withPerms);
  }
  if ((g = m(/^\/staff\/(.+)$/))) {
    const s = byId(users, g[1]);
    if (s.kind !== "staff") throw fail(404, "Not found");
    if (method === "PATCH") {
      if (body.role_id !== undefined && body.role_id !== s.role_id) {
        guard("roles", "assign");
        if (s.id === currentId) throw fail(422, "You cannot change your own role.");
        if (!roles.some((r) => r.id === body.role_id && r.kind === "staff")) throw fail(422, "Select a staff role.");
        s.role_id = body.role_id;
      }
      if (body.active !== undefined || body.first_name !== undefined || body.last_name !== undefined) {
        guard("roles", "edit");
        if (body.active === false && s.id === currentId) throw fail(422, "You cannot deactivate your own login.");
        if (body.active !== undefined) s.active = !!body.active;
        if (body.first_name !== undefined) s.first_name = String(body.first_name).trim();
        if (body.last_name !== undefined) s.last_name = String(body.last_name).trim();
      }
    }
    return withPerms(s);
  }

  /* ---------- roles & permissions ---------- */
  if (route === "/roles") {
    if (method === "POST") {
      guard("roles", "add");
      const name = String(body.name ?? "").trim();
      if (!name) throw fail(422, "Role name is required.");
      if (roles.some((r) => r.name.toLowerCase() === name.toLowerCase())) throw fail(409, "A role with this name already exists.");
      const r: Role = { id: id(), name, description: String(body.description ?? "").trim(), kind: "staff", permissions: { leads: ["view"], visits: ["view"], products: ["view"], documents: ["view"] } };
      roles.push(r);
      return r;
    }
    guard("roles", "view");
    return roles.map((r) => ({ ...r, staff_count: users.filter((u) => u.kind === "staff" && u.role_id === r.id).length }));
  }
  if ((g = m(/^\/roles\/(.+)$/))) {
    const r = byId(roles, g[1]);
    if (method === "PATCH") {
      guard("roles", "edit");
      if (r.id === ADMIN_ROLE_ID) throw fail(422, "The Admin role always has full access.");
      if (body.name !== undefined) r.name = String(body.name).trim() || r.name;
      if (body.description !== undefined) r.description = String(body.description);
      if (body.permissions) {
        const next: Doc = {};
        for (const mod of MODULES) {
          const asked: Action[] = (body.permissions[mod.key] ?? []).filter((a: Action) => (mod.actions as readonly Action[]).includes(a));
          next[mod.key] = r.kind === "partner" ? asked.filter((a) => (PARTNER_ALLOWED[mod.key] ?? []).includes(a)) : asked;
        }
        r.permissions = next;
      }
    }
    if (method === "DELETE") {
      guard("roles", "delete");
      if (r.system) throw fail(422, "System roles cannot be deleted.");
      if (users.some((u) => u.kind === "staff" && u.role_id === r.id)) throw fail(422, "Move the staff on this role to another role first.");
      roles = roles.filter((x) => x.id !== r.id);
      return { ok: true };
    }
    return { ...r, staff_count: users.filter((u) => u.kind === "staff" && u.role_id === r.id).length };
  }

  /* ---------- masters ---------- */
  if (route === "/lookups") return { ...masters, lead_statuses: LEAD_STATUSES };
  if ((g = m(/^\/masters\/([a-z_]+)$/))) {
    const key = g[1] as MasterKey;
    if (!MASTERS.some((x) => x.key === key)) throw fail(404, "Not found");
    const list = masters[key];
    const label = MASTERS.find((x) => x.key === key)!.label;
    const value = String(body.value ?? q.value ?? "").trim();
    if (method === "POST") {
      guard("masters", "add");
      if (!value) throw fail(422, `Enter the ${label.toLowerCase()}.`);
      if (list.some((x) => x.toLowerCase() === value.toLowerCase())) throw fail(409, `"${value}" already exists.`);
      masters[key] = [...list, value];
    } else if (method === "PATCH") {
      guard("masters", "edit");
      const to = String(body.to ?? "").trim();
      if (!to) throw fail(422, "Value cannot be empty.");
      if (list.some((x) => x !== body.from && x.toLowerCase() === to.toLowerCase())) throw fail(409, `"${to}" already exists.`);
      masters[key] = list.map((x) => (x === body.from ? to : x));
    } else if (method === "PUT") {
      guard("masters", "edit");
      const items: string[] = Array.isArray(body.items) ? body.items.map(String) : list;
      if (items.length !== list.length || items.some((x) => !list.includes(x))) throw fail(422, "Reorder must contain the same items.");
      masters[key] = items;
    } else if (method === "DELETE") {
      guard("masters", "delete");
      if (list.length <= 1) throw fail(422, "Keep at least one option.");
      masters[key] = list.filter((x) => x !== value);
    }
    return masters[key];
  }

  /* ---------- CP registration document config ---------- */
  if (route === "/reg-documents") {
    if (method === "PUT") {
      guard("reg_documents", "edit");
      if (!Array.isArray(body.items)) throw fail(422, "Invalid document list.");
      regDocs = body.items.map((d: Doc) => ({ id: d.id || id(), type: String(d.type ?? "").trim(), hint: String(d.hint ?? ""), rules: { ...d.rules }, entity_types: d.entity_types?.length ? d.entity_types : undefined }));
      if (regDocs.some((d) => !d.type)) throw fail(422, "Every document needs a name.");
    }
    return regDocs;
  }

  /* ---------- project & products ---------- */
  if (route === "/projects") return projects;
  if ((g = m(/^\/projects\/(.+)$/))) return byId(projects, g[1]);
  if (route === "/products") {
    if (method === "POST") {
      guard("products", "add");
      if (!String(body.name ?? "").trim()) throw fail(422, "Product name is required.");
      const p: Product = { id: id(), name: String(body.name).trim(), category: String(body.category ?? "").trim(), description: String(body.description ?? ""), image: body.image || "hero-security", active: body.active !== false, order: products.length + 1 };
      products.push(p);
      return p;
    }
    const u = me();
    const list = can(u, "products", "edit") ? products : products.filter((p) => p.active);
    return [...list].sort((a, b) => a.order - b.order);
  }
  if ((g = m(/^\/products\/(.+)$/))) {
    const p = byId(products, g[1]);
    if (method === "PATCH") {
      guard("products", "edit");
      Object.assign(p, clean({ name: body.name?.trim(), category: body.category?.trim(), description: body.description, image: body.image, active: body.active, order: body.order }));
      if (!p.name) throw fail(422, "Product name is required.");
    }
    if (method === "DELETE") {
      guard("products", "delete");
      products = products.filter((x) => x.id !== p.id);
      return { ok: true };
    }
    return p;
  }

  /* ---------- availability requests ("Request for Availability") ---------- */
  if (route === "/availability") {
    if (method === "POST") {
      const u = guard("availability", "add");
      const p = byId(products, body.product_id);
      let partner: Doc | null = null;
      if (!isStaffUser(u)) partner = partnerDirectory().find((x) => x.id === u.id) ?? { id: u.id, name: nameOf(u) || u.phone, partner_type: u.partner_type, mobile: u.phone, associated_employee: u.associated_employee };
      const staff = pickStaff(undefined, partner?.associated_employee);
      const at = iso(now());
      const r = {
        id: id(), product_id: p.id, product_name: p.name, partner_id: partner?.id ?? null, partner_name: partner ? partnerLabel(partner) : "", partner_type: partner?.partner_type ?? null, partner_mobile: partner?.mobile ?? "",
        requested_by: nameOf(u) || u.phone, assigned_to: nameOf(staff), assigned_to_id: staff.id, created_at: at,
      };
      availability.unshift(r);
      notify("Project Updates", "Availability requested", `${p.name}${partner ? ` for ${partner.name}` : ""} — assigned to ${nameOf(staff)}.`);
      return r;
    }
    guard("availability", "view");
    return sortDesc(scoped(availability), "created_at");
  }

  /* ---------- dashboard ---------- */
  if (route === "/dashboard") {
    const L = scoped(leads), V = scoped(visits), A = scoped(availability);
    return {
      leads: L.length, leads_in_progress: L.filter((l) => l.status === "In Progress").length, leads_converted: L.filter((l) => l.status === "Converted").length, leads_not_matured: L.filter((l) => l.status === "Not Matured").length,
      visits: V.length, visits_upcoming: V.filter((v) => v.status === "In Progress").length, visits_attended: V.filter((v) => v.status === "Attended").length,
      availability: A.length,
      registrations: registrations.length, registrations_pending: registrations.filter((r) => r.status === "Pending").length,
      partners: partnerDirectory().length, staff: activeStaff().length,
      unread_notifications: notifications.filter((n) => !n.read).length,
      documents: documents.length, projects: projects.length, products: products.filter((p) => p.active).length,
      featured: projects, news: sortDesc(news, "published_at").slice(0, 3),
    };
  }

  /* ---------- registrations ---------- */
  if (route === "/registrations") {
    if (method === "POST") {
      guard("registrations", "add");
      if (registrations.some((r) => last10(r.mobile) === last10(body.mobile)) || users.some((u) => u.kind !== "staff" && last10(u.phone) === last10(body.mobile))) throw fail(409, "A partner with this mobile number is already registered.");
      const r = { ...body, id: id(), registration_no: `CG-REG-2026-${String(registrations.length + 101).padStart(4, "0")}`, status: "Pending", created_at: iso(now()) };
      registrations.unshift(r);
      return r;
    }
    guard("registrations", "view");
    return sortDesc(registrations, "created_at").filter((r) => !q.status || r.status === q.status);
  }
  if ((g = m(/^\/registrations\/(.+)$/))) return byId(registrations, g[1]);

  /* ---------- leads ---------- */
  if (route === "/leads") {
    if (method === "POST") {
      const u = guard("leads", "add");
      const who = identify(body);
      const staff = pickStaff(can(u, "leads", "assign") ? body.assigned_to_id || undefined : undefined, who._partner?.associated_employee);
      const at = iso(now());
      const l: Doc = {
        ...clean(body), ...clean(who), assigned_to: nameOf(staff), assigned_to_id: staff.id, created_by: nameOf(u), document_requests: [], id: id(),
        status: "In Progress", created_at: at, updated_at: at,
        history: [{ title: "Lead Created", detail: who.partner_id ? `Added by ${nameOf(u)} on behalf of ${who.partner_name} · assigned to ${nameOf(staff)}` : `Added by ${nameOf(u)} · assigned to ${nameOf(staff)}`, at }],
      };
      leads.unshift(l);
      notify("Lead Updates", "New lead added", `${l.full_name}${who.partner_id ? ` for ${who.partner_name}` : ""} — assigned to ${nameOf(staff)}.`);
      return l;
    }
    guard("leads", "view");
    return sortDesc(scoped(leads), "updated_at").filter((l) => !q.status || q.status === "All" || l.status === q.status);
  }
  if (route === "/leads/bulk") {
    const u = guard("leads", "add");
    const rows: Doc[] = Array.isArray(body.rows) ? body.rows : [];
    const created: Doc[] = [];
    const skipped: { row: number; reason: string }[] = [];
    const known = new Set(leads.map((l) => last10(l.mobile)).filter(Boolean));
    rows.forEach((r, i) => {
      const mobile = last10(r.mobile);
      if (!String(r.full_name ?? "").trim()) return skipped.push({ row: i + 1, reason: "Full name missing" });
      if (mobile.length !== 10) return skipped.push({ row: i + 1, reason: "Invalid mobile number" });
      if (known.has(mobile)) return skipped.push({ row: i + 1, reason: "Lead with this mobile already exists" });
      known.add(mobile);
      const staffMatch = r.assigned_to ? activeStaff().find((s) => nameOf(s).toLowerCase() === String(r.assigned_to).trim().toLowerCase()) : undefined;
      const staff = pickStaff(staffMatch?.id);
      const at = iso(now());
      const l = {
        id: id(), full_name: String(r.full_name).trim(), mobile: `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`, mobile_last4: "", aadhaar_last4: "", email: r.email ?? "", category: r.category ?? "", configuration: r.configuration ?? "",
        source: r.source || "Bulk Upload", city: r.city ?? "", state: r.state ?? "", budget: "", address: "", notes: r.notes ?? "", project: PROJECT, temperature: "Warm", status: "In Progress",
        partner_id: null, partner_type: null, partner_name: "", assigned_to: nameOf(staff), assigned_to_id: staff.id, created_by: nameOf(u), document_requests: [], follow_up_date: "", follow_up_time: "", next_action: "",
        created_at: at, updated_at: at, history: [{ title: "Lead Created", detail: `Bulk upload by ${nameOf(u)} · assigned to ${nameOf(staff)}`, at }],
      };
      leads.unshift(l);
      created.push(l);
    });
    if (created.length) notify("Lead Updates", "Bulk upload completed", `${created.length} lead${created.length === 1 ? "" : "s"} imported${skipped.length ? `, ${skipped.length} skipped` : ""}.`);
    return { created: created.length, skipped };
  }
  if (route === "/leads/reassign") {
    const u = guard("leads", "reassign");
    const staff = pickStaff(body.staff_id);
    const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
    if (!ids.length) throw fail(422, "Select at least one lead.");
    const at = iso(now());
    let count = 0;
    leads.forEach((l) => {
      if (!ids.includes(l.id) || l.assigned_to_id === staff.id) return;
      l.history = [{ title: "Lead reassigned", detail: `${l.assigned_to || "Unassigned"} → ${nameOf(staff)} · by ${nameOf(u)}`, at }, ...(l.history ?? [])];
      l.assigned_to = nameOf(staff);
      l.assigned_to_id = staff.id;
      l.updated_at = at;
      count++;
    });
    if (count) notify("Lead Updates", "Leads reassigned", `${count} lead${count === 1 ? "" : "s"} reassigned to ${nameOf(staff)}.`);
    return { updated: count, staff: nameOf(staff) };
  }
  if ((g = m(/^\/leads\/(.+)\/document-requests$/))) {
    const l = byId(scoped(leads), g[1]);
    if (method === "POST") {
      if (l.status !== "Converted") throw fail(400, "Documents can be requested only for converted leads.");
      if (!body.documents?.length) throw fail(422, "Select at least one document.");
      const at = iso(now());
      const r = { id: id(), documents: body.documents, remarks: body.remarks ?? "", status: "Pending", raised_to: "CRM Team", raised_at: at };
      l.document_requests = [r, ...(l.document_requests ?? [])];
      l.history = [{ title: "Documents requested from CRM", detail: body.documents.join(", "), at }, ...(l.history ?? [])];
      l.updated_at = at;
      notify("Lead Updates", "Request raised to CRM team", `${body.documents.join(", ")} requested for ${l.full_name}.`);
      return r;
    }
    return l.document_requests ?? [];
  }
  if ((g = m(/^\/leads\/(.+)$/))) {
    const l = byId(scoped(leads), g[1]);
    if (method === "DELETE") {
      guard("leads", "delete");
      leads = leads.filter((x) => x.id !== l.id);
      visits.forEach((v) => v.lead_id === l.id && (v.lead_id = undefined));
      return { ok: true };
    }
    if (method === "PATCH") {
      const keys = Object.keys(body).filter((k) => body[k] !== undefined);
      const u = me();
      if (keys.some((k) => LEAD_EDIT_FIELDS.includes(k))) guard("leads", "edit");
      if (keys.some((k) => LEAD_MODIFY_FIELDS.includes(k))) guard("leads", "modify");
      if (keys.includes("assigned_to_id")) guard("leads", "reassign");
      const ev: Doc[] = [];
      const at = iso(now());
      if (keys.some((k) => ["partner_id", "mobile", "mobile_last4", "aadhaar_last4"].includes(k))) {
        const who = identify(body, l);
        if (who.partner_id !== l.partner_id) ev.push({ title: "Partner changed", detail: who.partner_name || "Direct lead", at });
        Object.assign(l, clean(who));
      }
      if (body.status && body.status !== l.status) ev.push({ title: `Status → ${body.status}`, detail: `Moved from ${l.status}`, at });
      if (body.follow_up_date && body.follow_up_date !== l.follow_up_date) ev.push({ title: "Follow-up scheduled", detail: body.follow_up_date + (body.follow_up_time ? ` · ${body.follow_up_time}` : ""), at });
      if (body.notes && body.notes !== l.notes) ev.push({ title: "Note added", detail: String(body.notes).slice(0, 120), at });
      if (body.next_action && body.next_action !== l.next_action) ev.push({ title: "Next action", detail: body.next_action, at });
      if (body.assigned_to_id && body.assigned_to_id !== l.assigned_to_id) {
        const s = pickStaff(body.assigned_to_id);
        ev.push({ title: "Lead reassigned", detail: `${l.assigned_to || "Unassigned"} → ${nameOf(s)} · by ${nameOf(u)}`, at });
        l.assigned_to = nameOf(s);
        l.assigned_to_id = s.id;
      }
      if (keys.some((k) => LEAD_EDIT_FIELDS.includes(k) && !["partner_id", "mobile", "mobile_last4", "aadhaar_last4"].includes(k))) ev.push({ title: "Lead details edited", detail: `by ${nameOf(u)}`, at });
      if (!ev.length) ev.push({ title: "Lead updated", detail: `by ${nameOf(u)}`, at });
      const rest = Object.fromEntries(Object.entries(body).filter(([k, v]) => v != null && (LEAD_EDIT_FIELDS.includes(k) || LEAD_MODIFY_FIELDS.includes(k)) && !["partner_id", "mobile", "mobile_last4", "aadhaar_last4"].includes(k)));
      Object.assign(l, rest, { updated_at: at, history: [...ev, ...(l.history ?? [])] });
    }
    return l;
  }

  /* ---------- project visits ---------- */
  if (route === "/visits") {
    if (method === "POST") {
      const u = guard("visits", "add");
      const lead = body.lead_id ? leads.find((l) => l.id === body.lead_id) : undefined;
      const who = identify(lead && body.partner_id === undefined ? { partner_id: lead.partner_id, mobile: lead.mobile, mobile_last4: lead.mobile_last4, aadhaar_last4: lead.aadhaar_last4, ...clean(body) } : body);
      const staff = pickStaff(can(u, "visits", "assign") ? body.assigned_to_id || undefined : undefined, lead?.assigned_to || who._partner?.associated_employee);
      const at = iso(now());
      const v: Doc = {
        ...clean(body), ...clean(who), assigned_to: nameOf(staff), assigned_to_id: staff.id, created_by: nameOf(u), id: id(), status: "In Progress", created_at: at,
        history: [{ title: "Visit scheduled", detail: `${body.visit_date} · ${body.visit_time} · by ${nameOf(u)}${who.partner_id ? ` for ${who.partner_name}` : ""}`, at }],
      };
      visits.unshift(v);
      if (lead) lead.history = [{ title: "Project visit scheduled", detail: `${body.visit_date} · ${body.visit_time}`, at }, ...(lead.history ?? [])];
      notify("Project Updates", "Visit scheduled", `Site visit for ${body.full_name} on ${body.visit_date} at ${body.visit_time}.`);
      return v;
    }
    guard("visits", "view");
    return sortDesc(scoped(visits), "created_at").filter((v) => !q.status || q.status === "All" || v.status === q.status);
  }
  if ((g = m(/^\/visits\/(.+)$/))) {
    const v = byId(scoped(visits), g[1]);
    if (method === "PATCH") {
      const u = guard("visits", "modify");
      const at = iso(now());
      if (body.status) {
        v.status = body.status;
        if (body.notes) v.notes = body.notes;
        v.history = [{ title: `Visit ${String(body.status).toLowerCase()}`, detail: [body.notes, `by ${nameOf(u)}`].filter(Boolean).join(" · "), at }, ...(v.history ?? [])];
      }
      v.updated_at = at;
    }
    return v;
  }

  /* ---------- MIS (data for the report registry in src/reports.ts) ---------- */
  if (route === "/mis") {
    guard("mis", "view");
    const u = me();
    return {
      generated_at: iso(now()), scope: isStaffUser(u) ? "all" : "own",
      leads: scoped(leads), visits: scoped(visits), availability: scoped(availability),
      registrations: isStaffUser(u) ? registrations : [],
    };
  }

  /* ---------- documents & WhatsApp ---------- */
  if (route === "/documents") {
    if (method === "POST") {
      guard("documents", "add");
      if (!String(body.name ?? "").trim()) throw fail(422, "Document name is required.");
      const d = { id: id(), name: String(body.name).trim(), category: body.category || "Marketing", type: body.type || "PDF", size: body.size || "—", url: body.url ?? "", file_name: body.file_name ?? "", order: documents.length + 1, updated_at: iso(now()) };
      documents.unshift(d);
      return d;
    }
    return documents.filter((d) => !q.category || q.category === "All" || d.category === q.category);
  }
  if ((g = m(/^\/documents\/(.+)$/))) return byId(documents, g[1]);
  if (route === "/whatsapp/log") {
    if (method === "POST") {
      // WhatsApp sending is a staff action (greetings / documents to partners).
      const u = guard(body.kind === "document" ? "documents" : "greetings", "view");
      if (!isStaffUser(u)) throw fail(403, "Only County Green staff can send on WhatsApp.");
      const entry = { id: id(), kind: body.kind, occasion: body.occasion ?? "", document: body.document ?? "", to_id: body.to_id ?? "", to_name: body.to_name ?? "", to_number: body.to_number ?? "", message: body.message ?? "", sent_by: nameOf(u), sent_at: iso(now()) };
      whatsappLog.unshift(entry);
      return entry;
    }
    me();
    return whatsappLog.filter((x) => !q.kind || x.kind === q.kind);
  }

  /* ---------- content (CMS) ---------- */
  if (route === "/news") {
    if (method === "POST") {
      guard("content", "add");
      if (!String(body.title ?? "").trim() || !String(body.body ?? "").trim()) throw fail(422, "Title and story are required.");
      const n = newsDoc({ id: id(), title: String(body.title).trim(), category: body.category || "Announcements", image: body.image || "hero-security", body: String(body.body), published_at: iso(now()) });
      news.unshift(n);
      return n;
    }
    return sortDesc(news, "published_at").filter((n) => !q.category || q.category === "All" || n.category === q.category);
  }
  if ((g = m(/^\/news\/(.+)$/))) {
    const n = byId(news, g[1]);
    if (method === "PATCH") {
      guard("content", "edit");
      const next = newsDoc({ ...n, ...clean({ title: body.title?.trim(), category: body.category, image: body.image, body: body.body }) });
      Object.assign(n, next);
      return n;
    }
    if (method === "DELETE") {
      guard("content", "delete");
      news = news.filter((x) => x.id !== n.id);
      return { ok: true };
    }
    return { ...n, related: sortDesc(news, "published_at").filter((x) => x.id !== n.id).slice(0, 3) };
  }
  if ((g = m(/^\/content\/(.+)$/))) {
    const c = content[g[1]];
    if (!c) throw fail(404, "Not found");
    if (method === "PUT") {
      guard("content", "edit");
      content[g[1]] = { ...c, ...body, key: c.key, ...(g[1] === "terms" ? { updated: fmtDay(new Date()) } : {}) };
      return content[g[1]];
    }
    return c;
  }

  /* ---------- notifications ---------- */
  if (route === "/notifications") return sortDesc(notifications, "created_at");
  if (route === "/notifications/read-all") {
    notifications = notifications.map((n) => ({ ...n, read: true }));
    return { ok: true };
  }
  if ((g = m(/^\/notifications\/(.+)\/read$/))) {
    byId(notifications, g[1]).read = true;
    return { ok: true };
  }

  throw fail(404, `No static data for ${method} ${path}`);
}

