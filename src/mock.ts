// Static data mode — serves the whole app without a backend.
// Enabled with EXPO_PUBLIC_STATIC_MODE=1. Mirrors the FastAPI routes in backend/server.py.
import type { User } from "@/src/api";
import { storage } from "@/src/utils/storage";
import { CATEGORIES, CONFIGURATIONS, DOCUMENT_REQUEST_TYPES, LEAD_SOURCES, LEAD_STATUSES, NEXT_ACTIONS, RERA_CERTIFICATE, partnerProfile } from "@/src/brand";

type Doc = Record<string, any>;
const now = () => new Date();
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86400000));
const daysAhead = (n: number) => new Date(Date.now() + n * 86400000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
let seq = 1000;
const id = () => `static-${++seq}`;

const PROJECT = "County Greens";
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
  intro: "County Greens is a township arriving soon in New Chandigarh — a home that comes with more. Positioned as the first township from north of Chandigarh, it is designed to be close to the city, yet away from its chaos: optimum greenery, multiple water features and everyday moments thoughtfully designed.",
  highlights: ["First Township from North of Chandigarh", "Close to the city, away from its chaos", "Optimum greenery & multiple water features", "A township built for young champions", "Forging a sustainable future"],
  amenities: AMENITIES, configuration: "To be announced", price_from: "To be announced", rera_number: "To be announced", possession: "To be announced",
  project_type: "Residential Township", developer: "County Greens (placeholder — replace with developer name)", total_area: "To be announced", order: 1,
}];

const employees = ["Aman Verma", "Harleen Kaur", "Rohit Sharma", "Simran Gill", "Vikram Singh"].map((name, i) => ({ id: `emp-${i}`, name, role: "Sales Manager" }));

const content: Record<string, Doc> = {
  about: {
    key: "about", title: "About County Greens", subtitle: "Home That Comes With More", hero_image: "hero-sunset",
    story: "County Greens, New Chandigarh, is a township arriving soon — positioned as the first township from north of Chandigarh. It is built on a simple promise: a home that comes with more. Close to the city, yet away from its chaos, County Greens brings together optimum greenery, multiple water features and spaces designed for everyday moments — thoughtfully designed, delightfully curated and rightfully planned.",
    pillars: [
      { title: "Everyday Moments", body: "Thoughtfully designed spaces — from quiet mornings in the yoga & meditation space to festive nights at the community amphitheatre." },
      { title: "Built for Champions", body: "A township built for young champions, with multiple sports arenas, training spaces and a state of the art club house." },
      { title: "Sustainable Future", body: "Forging a sustainable future with optimum greenery, water features and an address that feels like an escape." },
    ],
    highlights: ["Arriving Soon · New Chandigarh", "First Township from North of Chandigarh", "Round the Clock Security", "Convenience Store & Pharmacy"],
    company_note: "Company registration, RERA and corporate details are placeholders and will be updated with official County Greens information.",
    images: ["golden", "play", "sustainable", "quiet"],
  },
  terms: {
    key: "terms", title: "Terms & Conditions", updated: "01 Jun 2026",
    sections: [
      { title: "1. Introduction", body: "Welcome to the County Greens Channel Partner application. By accessing or using the app, you agree to be bound by these Terms & Conditions and all applicable laws and regulations. If you do not agree, please do not use the application. [Placeholder — replace with County Greens legal copy.]" },
      { title: "2. Channel Partner Eligibility", body: "Registration as a channel partner is subject to verification of identity, company and RERA documentation submitted through the app. County Greens reserves the right to approve, hold or decline applications." },
      { title: "3. Leads & Registrations", body: "Leads, registrations and project visits recorded through the app are governed by County Greens' partner policy. Attribution is based on first valid registration and may be subject to verification." },
      { title: "4. Project Information", body: "Project details, configurations, pricing and inventory shown in the app are indicative and subject to change without notice. Please refer to official project documents for confirmed information." },
      { title: "5. Data & Privacy", body: "Personal information collected is used solely to operate the partner programme and is handled in accordance with County Greens' privacy policy." },
      { title: "6. Changes to Terms", body: "County Greens may update these terms from time to time. Continued use of the application constitutes acceptance of the revised terms." },
    ],
  },
};

const documents: Doc[] = ([
  ["Project Brochure", "Marketing", "PDF", "8.4 MB"], ["Master Layout Plan", "Technical", "PDF", "4.1 MB"], ["Price List (Placeholder)", "Pricing", "PDF", "1.2 MB"],
  ["Payment Plan (Placeholder)", "Legal", "PDF", "1.0 MB"], ["Channel Partner Agreement", "Legal", "PDF", "0.9 MB"], ["RERA Certificate (To be updated)", "Legal", "PDF", "0.6 MB"],
  ["Amenities Presentation", "Marketing", "PDF", "12.3 MB"], ["Social Media Creative Kit", "Marketing", "ZIP", "45.0 MB"],
] as const).map(([name, category, type, size], i) => ({ id: `doc-${i}`, name, category, type, size, order: i + 1, updated_at: daysAgo((i + 1) * 3) }));

const news: Doc[] = ([
  ["County Greens Arriving Soon in New Chandigarh", "Project Updates", "hero-security", "County Greens, positioned as the first township from north of Chandigarh, is arriving soon. Partners can begin registering interest and scheduling project visits through the app.\n\nThe township is designed to be close to the city, away from its chaos — with optimum greenery, multiple water features and round-the-clock security.\n\nDetailed configurations, pricing and possession timelines will be shared with partners as they are announced.", 1],
  ["A Township Built for Young Champions", "Announcements", "tennis", "Multiple sports arenas and training spaces form a core part of the County Greens experience. From tennis and basketball courts to a state of the art club house, the township is planned so that play has no limits.\n\nPartners can use the amenities presentation in Documents when introducing the project to families with young sportspersons.", 3],
  ["Everyday Moments, Thoughtfully Designed", "Marketing", "everyday-moments", "The latest County Greens creative campaign — Everyday Moments — captures quiet mornings, active evenings and festive nights within the township.\n\nThe complete social media creative kit is now available in the Documents section for partner use.", 5],
  ["Partner Meet: Project Walkthrough", "Events", "amphitheatre", "An exclusive walkthrough for channel partners is being planned at the County Greens site in New Chandigarh. Dates will be confirmed via notifications.\n\nThe session will cover the master layout, amenities such as the amphitheatre and yoga & meditation space, and the partner registration process.", 8],
  ["Forging a Sustainable Future", "Project Updates", "sustainable", "Optimum greenery and multiple water features are central to County Greens' planning. The township is designed as an address that feels like an escape — where every view feels private.", 12],
] as const).map(([title, category, image, body, d], i) => ({ id: `news-${i}`, title, category, image, body, excerpt: body.split("\n")[0].slice(0, 140), author: "County Greens Sales", read_time: `${Math.max(2, Math.floor(body.length / 400))} min read`, published_at: daysAgo(d) }));

let notifications: Doc[] = ([
  ["Registration Updates", "Registration approved", "Registration CG-REG-2026-0102 for Ayesha Khan has been approved.", false, 0.1],
  ["Lead Updates", "Follow-up due today", "Rajesh Kumar — call scheduled at 11:00 AM.", false, 0.3],
  ["Project Updates", "New creative kit available", "Everyday Moments social media creatives added to Documents.", false, 1.2],
  ["Announcements", "Partner walkthrough being planned", "Site walkthrough for channel partners at New Chandigarh. Dates to follow.", true, 2.0],
  ["System", "Profile verified", "Your channel partner profile has been verified. Welcome to County Greens.", true, 4.0],
] as const).map(([category, title, body, read, d], i) => ({ id: `notif-${i}`, category, title, body, read, created_at: daysAgo(d) }));

const registrations: Doc[] = ([
  ["Ayesha", "Khan", "Influencer", "+91 98765 43210", "Mumbai", "Maharashtra", "Completed", 4],
  ["Rohit", "Mehra", "Broker", "+91 91234 56789", "Chandigarh", "Punjab", "Pending", 2],
  ["Neha", "Iyer", "Channel Partner", "+91 99887 76655", "Mohali", "Punjab", "Pending", 1],
  ["Karan", "Bedi", "Freelancer", "+91 98100 22334", "Panchkula", "Punjab", "Completed", 9],
] as const).map(([first_name, last_name, category, mobile, city, state, status, d], i) => ({
  id: `reg-${i}`, registration_no: `CG-REG-2026-${String(101 + i).padStart(4, "0")}`, first_name, last_name, category, mobile, email: `${first_name.toLowerCase()}.${last_name.toLowerCase()}@example.com`,
  city, state, address: `${12 + i}, Sector ${40 + i}`, pincode: "160001", company: partnerProfile(category).entityLabel ? `${last_name} Realty` : "", project: PROJECT, status, notes: "",
  documents: partnerProfile(category).rera ? [{ type: RERA_CERTIFICATE, status: status === "Completed" ? "Verified" : "Under Review", file_name: "rera-certificate.pdf" }] : [],
  social: category === "Influencer" ? { facebook: `https://facebook.com/${first_name.toLowerCase()}.${last_name.toLowerCase()}`, instagram: `https://instagram.com/${first_name.toLowerCase()}_${last_name.toLowerCase()}`, youtube: `https://youtube.com/@${first_name.toLowerCase()}${last_name.toLowerCase()}` } : {},
  created_at: daysAgo(d),
}));

const leads: Doc[] = ([
  ["Rajesh Kumar", "+91 98765 43210", "Individual", "Walk-in", "In Progress", "Hot", "3 BHK", "Chandigarh", 1, "Channel Partner", "Gill Realty LLP"],
  ["Priya Sharma", "+91 87654 32109", "Individual", "Reference", "In Progress", "Warm", "4 BHK", "Mohali", 2, "Broker", "Rohit Mehra"],
  ["Amit Patel", "+91 96543 21098", "Corporate", "Website", "Converted", "Hot", "Plot", "Ludhiana", 5, "Channel Partner", "Gill Realty LLP"],
  ["Sneha Desai", "+91 95432 10987", "Individual", "Social Media", "In Progress", "Cold", "2 BHK", "Panchkula", 7, "Influencer", "Ayesha Khan"],
  ["Vikram Singh", "+91 94321 09876", "NRI", "Reference", "Not Matured", "Cold", "Villa", "Delhi", 12, "Freelancer", "Karan Bedi"],
  ["Meera Joshi", "+91 93210 98765", "Individual", "Exhibition", "Converted", "Warm", "3 BHK", "Zirakpur", 15, "Broker", "Rohit Mehra"],
] as const).map(([full_name, mobile, category, source, status, temperature, configuration, city, d, partner_type, partner_name], i) => ({
  id: `lead-${i}`, full_name, mobile, partner_type, partner_name, assigned_to: employees[i % employees.length].name, document_requests: [] as Doc[], email: `${full_name.split(" ")[0].toLowerCase()}.${full_name.split(" ")[1].toLowerCase()}@example.com`, category, source, status, temperature, configuration, city, state: "Punjab",
  project: PROJECT, budget: "To be discussed", address: "", notes: "Interested in the township launch. Shared brochure and amenities deck.",
  follow_up_date: daysAhead((i % 4) + 1), follow_up_time: "11:00 AM", next_action: "Schedule project visit", created_at: daysAgo(d), updated_at: daysAgo(Math.max(0, d - 1)),
  history: [
    { title: `Status → ${status}`, detail: "Updated after client discussion", at: daysAgo(Math.max(0, d - 1)) },
    { title: "Brochure shared", detail: "Project brochure and amenities presentation sent on WhatsApp", at: daysAgo(d - 0.1) },
    { title: "Lead Created", detail: `Lead captured via ${source}`, at: daysAgo(d) },
  ],
}));

const visits: Doc[] = ([
  ["Rahul Kapoor", "+91 98765 43210", "Client", "In Progress", 0, "10:30 AM"],
  ["Priya Nair", "+91 87654 32109", "Client", "In Progress", 1, "02:00 PM"],
  ["Vikram Singh", "+91 94321 09876", "Broker", "Attended", -2, "11:00 AM"],
  ["Meera Joshi", "+91 93210 98765", "Client", "Attended", -4, "04:30 PM"],
  ["Arjun Malhotra", "+91 90000 11111", "Client", "Attended", -6, "12:00 PM"],
] as const).map(([full_name, mobile, visitor_type, status, d, visit_time], i) => ({
  id: `visit-${i}`, full_name, mobile, assigned_to: employees[(i + 2) % employees.length].name, booked_by: "Channel Partner", email: `${full_name.split(" ")[0].toLowerCase()}@example.com`, visitor_type, status, project: PROJECT, visit_date: daysAhead(d), visit_time,
  city: "Chandigarh", state: "Punjab", address: "", notes: "Client keen to see the sample layout, club house and green areas.", follow_up: "Share price list once announced", created_at: daysAgo(Math.max(1, Math.abs(d))),
  history: [{ title: "Visit scheduled", detail: visit_time, at: daysAgo(Math.max(1, Math.abs(d)) + 1) }, ...(status === "Attended" ? [{ title: "Visit attended", detail: "Walkthrough completed", at: daysAgo(-d) }] : [])],
}));

// Deterministic sample inventory (3 blocks × 6 floors × 3 units)
const units: Doc[] = [];
{
  let s = 7;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
  let order = 0;
  for (const tower of ["Block A", "Block B", "Block C"]) for (let floor = 1; floor <= 6; floor++) for (let k = 1; k <= 3; k++) {
    order++;
    const cfg = pick(["2 BHK", "3 BHK", "3 BHK + Study", "4 BHK"] as const);
    const area = ({ "2 BHK": 1150, "3 BHK": 1650, "3 BHK + Study": 1890, "4 BHK": 2450 } as const)[cfg] + pick([0, 25, 40]);
    const r = rnd();
    const status = r < 0.5 ? "Available" : r < 0.7 ? "Booked" : r < 0.8 ? "Reserved" : "Sold";
    const suffix = floor === 1 ? "st" : floor === 2 ? "nd" : floor === 3 ? "rd" : "th";
    units.push({ id: `unit-${order}`, unit_no: `${tower.slice(-1)}-${floor}0${k}`, tower, floor: `${floor}${suffix} Floor`, configuration: cfg, area_sqft: area, carpet_sqft: Math.floor(area * 0.72), facing: pick(["East", "North", "North-East", "West"]), balconies: cfg.startsWith("2") ? 2 : 3, parking: cfg.startsWith("2") ? "1 Covered" : "2 Covered", status, price: "To be announced", project: PROJECT, image: pick(["living", "panoramic", "private", "couple-balcony"]), note: "Sample inventory for demonstration — replace with live County Greens inventory.", order });
  }
}

const freshUser = (): User => ({ id: "static-user", phone: "+919000000001", country_code: "+91", mobile: "9000000001", profile_step: 0, profile_completed: false, created_at: daysAgo(30) });
let user: User = freshUser();

let assignSeq = 0;
// Lead / visit ownership: the partner who created it, and the staff member it is bound to
// (the partner's associated employee if they named one, otherwise round-robin).
const ownership = () => ({
  partner_type: user.partner_type ?? "Channel Partner",
  partner_name: user.company_name || `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || "You",
  assigned_to: user.associated_employee || employees[assignSeq++ % employees.length].name,
});

// There is no server: the partner's profile and everything they create is saved on the
// device so it survives app restarts. Static content (project, news, documents, units) is not saved.
const DB_KEY = "cg_static_db_v1";
let loading: Promise<void> | null = null;
const replaceAll = (arr: Doc[], next: unknown) => {
  if (Array.isArray(next)) arr.splice(0, arr.length, ...next);
};
function loadDb() {
  loading ??= (async () => {
    const raw = await storage.getItem<string | null>(DB_KEY, null);
    if (!raw) return;
    try {
      const db = JSON.parse(raw);
      if (db.user) user = db.user;
      replaceAll(registrations, db.registrations);
      replaceAll(leads, db.leads);
      replaceAll(visits, db.visits);
      if (Array.isArray(db.notifications)) notifications = db.notifications;
      if (typeof db.seq === "number") seq = Math.max(seq, db.seq);
      if (typeof db.assignSeq === "number") assignSeq = db.assignSeq;
    } catch {
      // Corrupt snapshot: start again from the sample data.
    }
  })();
  return loading;
}
const saveDb = () => storage.setItem(DB_KEY, JSON.stringify({ user, registrations, leads, visits, notifications, seq, assignSeq }));

const byId = (arr: Doc[], id_: string) => {
  const d = arr.find((x) => x.id === id_);
  if (!d) throw Object.assign(new Error("Not found"), { status: 404 });
  return d;
};
const sortDesc = (arr: Doc[], key: string) => [...arr].sort((a, b) => (a[key] < b[key] ? 1 : -1));

export async function mockRequest(method: string, path: string, body?: any): Promise<any> {
  await new Promise((r) => setTimeout(r, 120)); // feel like a network call
  await loadDb();
  const result = await handle(method, path, body);
  if (method !== "GET") await saveDb();
  return result;
}

async function handle(method: string, path: string, body?: any): Promise<any> {
  const [route, qs = ""] = path.split("?");
  const q = Object.fromEntries(new URLSearchParams(qs));
  const m = (re: RegExp) => route.match(re);
  let g: RegExpMatchArray | null;

  if (route === "/auth/request-otp") return { message: "OTP sent", expires_in: 300, demo_hint: "Use OTP 111111 in demo mode" };
  if (route === "/auth/verify-otp") {
    if (body?.otp !== "111111") throw Object.assign(new Error("The code you entered is incorrect."), { status: 401 });
    const phone = `${body.country_code}${body.phone}`;
    // A different mobile number on this device starts with its own, empty profile.
    if (user.phone !== phone && user.profile_step) user = freshUser();
    user = { ...user, phone, country_code: body.country_code, mobile: body.phone };
    return { access_token: "static-token", token_type: "bearer", user };
  }
  if (route === "/me") {
    if (method === "PUT") user = { ...user, ...body };
    return user;
  }
  if (route === "/employees") return employees;
  if (route === "/lookups") return { customer_categories: CATEGORIES, configurations: CONFIGURATIONS, lead_sources: LEAD_SOURCES, lead_statuses: LEAD_STATUSES, next_actions: NEXT_ACTIONS, document_request_types: DOCUMENT_REQUEST_TYPES };
  if (route === "/projects") return projects;
  if ((g = m(/^\/projects\/(.+)$/))) return byId(projects, g[1]);
  if (route === "/dashboard") return {
    registrations: registrations.length, leads: leads.length, visits: visits.length, unread_notifications: notifications.filter((n) => !n.read).length,
    documents: documents.length, projects: projects.length, units_available: units.filter((u) => u.status === "Available").length, units_total: units.length,
    leads_in_progress: leads.filter((l) => l.status === "In Progress").length, visits_upcoming: visits.filter((v) => v.status === "In Progress").length,
    featured: projects, news: sortDesc(news, "published_at").slice(0, 3),
  };
  if (route === "/registrations") {
    if (method === "POST") {
      const r = { ...body, id: id(), registration_no: `CG-REG-2026-${String(registrations.length + 101).padStart(4, "0")}`, status: "Pending", created_at: iso(now()) };
      registrations.unshift(r);
      return r;
    }
    return sortDesc(registrations, "created_at").filter((r) => !q.status || r.status === q.status);
  }
  if ((g = m(/^\/registrations\/(.+)$/))) return byId(registrations, g[1]);
  if (route === "/leads") {
    if (method === "POST") {
      const l = { ...body, ...ownership(), document_requests: [], id: id(), status: "In Progress", created_at: iso(now()), updated_at: iso(now()), history: [{ title: "Lead Created", detail: `Lead created by ${user.first_name || "partner"}`, at: iso(now()) }] };
      leads.unshift(l);
      return l;
    }
    return sortDesc(leads, "updated_at").filter((l) => !q.status || q.status === "All" || l.status === q.status);
  }
  if ((g = m(/^\/leads\/(.+)\/document-requests$/))) {
    const l = byId(leads, g[1]);
    if (method === "POST") {
      if (l.status !== "Converted") throw Object.assign(new Error("Documents can be requested only for converted leads."), { status: 400 });
      if (!body?.documents?.length) throw Object.assign(new Error("Select at least one document."), { status: 422 });
      const at = iso(now());
      const r = { id: id(), documents: body.documents, remarks: body.remarks ?? "", status: "Pending", raised_to: "CRM Team", raised_at: at };
      l.document_requests = [r, ...(l.document_requests ?? [])];
      l.history = [{ title: "Documents requested from CRM", detail: body.documents.join(", "), at }, ...(l.history ?? [])];
      l.updated_at = at;
      notifications.unshift({ id: id(), category: "Lead Updates", title: "Request raised to CRM team", body: `${body.documents.join(", ")} requested for ${l.full_name}.`, read: false, created_at: at });
      return r;
    }
    return l.document_requests ?? [];
  }
  if ((g = m(/^\/leads\/(.+)$/))) {
    const l = byId(leads, g[1]);
    if (method === "PATCH") {
      const ev: Doc[] = [];
      const at = iso(now());
      if (body.status && body.status !== l.status) ev.push({ title: `Status → ${body.status}`, detail: `Moved from ${l.status}`, at });
      if (body.follow_up_date) ev.push({ title: "Follow-up scheduled", detail: body.follow_up_date + (body.follow_up_time ? ` · ${body.follow_up_time}` : ""), at });
      if (body.notes && body.notes !== l.notes) ev.push({ title: "Note added", detail: String(body.notes).slice(0, 120), at });
      if (body.next_action) ev.push({ title: "Next action", detail: body.next_action, at });
      if (!ev.length) ev.push({ title: "Lead updated", detail: "Details updated", at });
      Object.assign(l, Object.fromEntries(Object.entries(body).filter(([, v]) => v != null)), { updated_at: at, history: [...ev, ...(l.history ?? [])] });
    }
    return l;
  }
  if (route === "/visits") {
    if (method === "POST") {
      const { partner_type, assigned_to } = ownership();
      const v = { ...body, booked_by: partner_type, assigned_to, id: id(), status: "In Progress", created_at: iso(now()), history: [] };
      visits.unshift(v);
      notifications.unshift({ id: id(), category: "Project Updates", title: "Visit scheduled", body: `Site visit for ${body.full_name} on ${body.visit_date} at ${body.visit_time}.`, read: false, created_at: iso(now()) });
      return v;
    }
    return sortDesc(visits, "visit_date").filter((v) => !q.status || q.status === "All" || v.status === q.status);
  }
  if ((g = m(/^\/visits\/(.+)$/))) {
    const v = byId(visits, g[1]);
    if (method === "PATCH") {
      Object.assign(v, Object.fromEntries(Object.entries(body).filter(([, x]) => x != null)), { updated_at: iso(now()) });
      if (body.status) v.history = [{ title: `Visit ${String(body.status).toLowerCase()}`, detail: body.notes || "", at: iso(now()) }, ...(v.history ?? [])];
    }
    return v;
  }
  if (route === "/mis") {
    const days = ({ daily: 1, weekly: 7, monthly: 30 } as Record<string, number>)[q.period] ?? 30;
    const since = Date.now() - days * 86400000;
    const c = (arr: Doc[], f?: (x: Doc) => boolean) => arr.filter(f ?? (() => true)).length;
    const conv = c(leads, (l) => l.status === "Converted"), att = c(visits, (v) => v.status === "Attended");
    const by_category: Record<string, number> = {};
    registrations.forEach((r) => (by_category[r.category] = (by_category[r.category] ?? 0) + 1));
    return {
      period: q.period ?? "monthly",
      leads: { total: leads.length, in_progress: c(leads, (l) => l.status === "In Progress"), converted: conv, not_matured: c(leads, (l) => l.status === "Not Matured"), recent: c(leads, (l) => new Date(l.created_at).getTime() >= since) },
      visits: { total: visits.length, attended: att, in_progress: visits.length - att, recent: c(visits, (v) => new Date(v.created_at).getTime() >= since) },
      registrations: { total: registrations.length, pending: c(registrations, (r) => r.status === "Pending"), completed: c(registrations, (r) => r.status === "Completed"), by_category },
      conversion_rate: leads.length ? Math.round((conv / leads.length) * 100) : 0, visit_rate: visits.length ? Math.round((att / visits.length) * 100) : 0,
    };
  }
  if (route === "/units/summary") return { total: units.length, towers: [...new Set(units.map((u) => u.tower))].sort(), available: units.filter((u) => u.status === "Available").length, booked: units.filter((u) => u.status === "Booked").length, reserved: units.filter((u) => u.status === "Reserved").length, sold: units.filter((u) => u.status === "Sold").length };
  if (route === "/units") return units.filter((u) => (!q.tower || q.tower === "All" || u.tower === q.tower) && (!q.status || q.status === "All" || u.status === q.status));
  if ((g = m(/^\/units\/(.+)$/))) return byId(units, g[1]);
  if (route === "/documents") return documents.filter((d) => !q.category || q.category === "All" || d.category === q.category);
  if (route === "/news") return sortDesc(news, "published_at").filter((n) => !q.category || q.category === "All" || n.category === q.category);
  if ((g = m(/^\/news\/(.+)$/))) return { ...byId(news, g[1]), related: sortDesc(news, "published_at").filter((n) => n.id !== g![1]).slice(0, 3) };
  if (route === "/notifications") return sortDesc(notifications, "created_at");
  if (route === "/notifications/read-all") { notifications = notifications.map((n) => ({ ...n, read: true })); return { ok: true }; }
  if ((g = m(/^\/notifications\/(.+)\/read$/))) { byId(notifications, g[1]).read = true; return { ok: true }; }
  if ((g = m(/^\/content\/(.+)$/))) { const c = content[g[1]]; if (!c) throw Object.assign(new Error("Not found"), { status: 404 }); return c; }
  throw Object.assign(new Error(`No static data for ${method} ${path}`), { status: 404 });
}
