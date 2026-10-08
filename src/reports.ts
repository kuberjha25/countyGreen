// MIS report registry. Each report is a definition over the MIS data set
// (leads, visits, availability requests, registrations), so new reports and
// parameters are added here without changing the MIS screen.
import { parseDate } from "@/src/format";

type Doc = Record<string, any>;
export type MisData = { scope: "all" | "own"; leads: Doc[]; visits: Doc[]; availability: Doc[]; registrations: Doc[] };
export type Link = { pathname: string; params?: Record<string, string> };
export type ReportRow = { label: string; value: number; link?: Link };
export type Report = { key: string; title: string; group: "Leads" | "Project Visits" | "Availability" | "Partners"; staffOnly?: boolean; rows: (d: MisData) => ReportRow[] };

export const PERIODS = { today: "Today", week: "7 days", month: "30 days", all: "All time" } as const;
export type Period = keyof typeof PERIODS;
const PERIOD_DAYS: Record<Period, number | null> = { today: 0, week: 6, month: 29, all: null };

const LEADS = "/(tabs)/leads";
const VISITS = "/(tabs)/visits";

function countBy(arr: Doc[], key: string, link?: (value: string) => Link, empty = "Not set"): ReportRow[] {
  const map = new Map<string, number>();
  arr.forEach((x) => map.set(x[key] || empty, (map.get(x[key] || empty) ?? 0) + 1));
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value, link: link && label !== empty ? link(label) : undefined }));
}

export const REPORTS: Report[] = [
  { key: "lead_status", title: "Leads by Status", group: "Leads", rows: (d) => countBy(d.leads, "status", (v) => ({ pathname: LEADS, params: { status: v } })) },
  { key: "lead_source", title: "Leads by Source", group: "Leads", rows: (d) => countBy(d.leads, "source", (v) => ({ pathname: LEADS, params: { status: "All", source: v } })) },
  { key: "lead_category", title: "Leads by Customer Category", group: "Leads", rows: (d) => countBy(d.leads, "category", (v) => ({ pathname: LEADS, params: { status: "All", category: v } })) },
  { key: "lead_configuration", title: "Leads by Preferred Configuration", group: "Leads", rows: (d) => countBy(d.leads, "configuration", (v) => ({ pathname: LEADS, params: { status: "All", configuration: v } })) },
  { key: "lead_partner_type", title: "Leads by Partner Type", group: "Leads", staffOnly: true, rows: (d) => countBy(d.leads.map((l) => ({ ...l, partner_type: l.partner_type || "Direct" })), "partner_type", (v) => ({ pathname: LEADS, params: { status: "All", partner_type: v } })) },
  { key: "lead_partner", title: "Leads by CP / Freelancer / Influencer", group: "Partners", staffOnly: true, rows: (d) => countBy(d.leads.filter((l) => l.partner_name), "partner_name", (v) => ({ pathname: LEADS, params: { status: "All", partner_name: v } })) },
  { key: "lead_staff", title: "Leads by Assigned Staff", group: "Leads", staffOnly: true, rows: (d) => countBy(d.leads, "assigned_to", (v) => ({ pathname: LEADS, params: { status: "All", assigned_to: v } })) },
  { key: "conversion_staff", title: "Conversions by Staff", group: "Leads", staffOnly: true, rows: (d) => countBy(d.leads.filter((l) => l.status === "Converted"), "assigned_to", (v) => ({ pathname: LEADS, params: { status: "Converted", assigned_to: v } })) },
  { key: "visit_status", title: "Project Visits by Status", group: "Project Visits", rows: (d) => countBy(d.visits, "status", (v) => ({ pathname: VISITS, params: { status: v } })) },
  { key: "visit_staff", title: "Project Visits by Assigned Staff", group: "Project Visits", staffOnly: true, rows: (d) => countBy(d.visits, "assigned_to", (v) => ({ pathname: VISITS, params: { status: "All", assigned_to: v } })) },
  { key: "visit_slot", title: "Project Visits by Time Slot", group: "Project Visits", rows: (d) => countBy(d.visits, "visit_time", (v) => ({ pathname: VISITS, params: { status: "All", visit_time: v } })) },
  { key: "availability_product", title: "Availability Requests by Product", group: "Availability", rows: (d) => countBy(d.availability, "product_name", () => ({ pathname: "/availability" })) },
  { key: "availability_status", title: "Availability Requests by Status", group: "Availability", rows: (d) => countBy(d.availability, "status", (v) => ({ pathname: "/availability", params: { status: v } })) },
  { key: "registrations_category", title: "Registrations by Partner Type", group: "Partners", staffOnly: true, rows: (d) => countBy(d.registrations, "category", () => ({ pathname: "/registrations" })) },
];

export function inPeriod(d: MisData, period: Period, staff?: string): MisData {
  const days = PERIOD_DAYS[period];
  const since = days === null ? null : new Date(new Date().setHours(0, 0, 0, 0) - days * 86400000).getTime();
  const recent = (x: Doc) => since === null || (parseDate(x.created_at)?.getTime() ?? 0) >= since;
  const keep = (x: Doc) => recent(x) && (!staff || x.assigned_to === staff);
  // Registrations have no assigned staff, so the staff filter does not apply to them.
  return { ...d, leads: d.leads.filter(keep), visits: d.visits.filter(keep), availability: d.availability.filter(keep), registrations: d.registrations.filter(recent) };
}

export function kpis(d: MisData) {
  const converted = d.leads.filter((l) => l.status === "Converted").length;
  const attended = d.visits.filter((v) => v.status === "Attended").length;
  return {
    leads: d.leads.length,
    converted,
    conversion: d.leads.length ? Math.round((converted / d.leads.length) * 100) : 0,
    visits: d.visits.length,
    pendingVisits: d.visits.filter((v) => v.status === "In Progress").length,
    attendance: d.visits.length ? Math.round((attended / d.visits.length) * 100) : 0,
    availabilityPending: d.availability.filter((a) => a.status === "Pending").length,
  };
}

const csvCell = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

export function toCsv(reports: Report[], d: MisData, heading: string) {
  const k = kpis(d);
  const lines = [heading, "", "Summary,Value", `Total leads,${k.leads}`, `Converted leads,${k.converted}`, `Conversion %,${k.conversion}`, `Project visits,${k.visits}`, `Pending visits,${k.pendingVisits}`, `Visit attendance %,${k.attendance}`, `Pending availability requests,${k.availabilityPending}`];
  reports.forEach((r) => {
    lines.push("", `${csvCell(r.title)},Count`);
    r.rows(d).forEach((row) => lines.push(`${csvCell(row.label)},${row.value}`));
  });
  return lines.join("\n");
}
