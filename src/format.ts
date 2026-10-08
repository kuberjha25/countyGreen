export function fmtDate(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d : dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return `${fmtDate(d)} · ${dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

export function relTime(d?: string) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.floor(h / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

export const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-");

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

// Parses ISO strings and the "DD MMM YYYY" dates used by follow-ups / visits
// (e.g. "05 Oct 2026", "05-Oct-2026") without relying on engine-specific Date parsing.
export function parseDate(d?: string): Date | null {
  if (!d) return null;
  const m = d.match(/^(\d{1,2})[ /-]([A-Za-z]{3})[A-Za-z]*[ /-](\d{4})$/);
  if (m) {
    const month = MONTHS.indexOf(m[2].toLowerCase());
    return month < 0 ? null : new Date(Number(m[3]), month, Number(m[1]));
  }
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "09 Oct 2026" — the format used for follow-ups, visits, birthdays and anniversaries.
export function fmtDay(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

export const digits = (v?: string) => (v ?? "").replace(/\D/g, "");
export const isLast4 = (v?: string) => /^\d{4}$/.test(v ?? "");

// CP / Freelancer / Influencer leads are identified by the last 4 digits of the
// customer's mobile and Aadhaar only — the full number is never captured.
export const maskedMobile = (last4?: string) => (last4 ? `XXXXXX${last4}` : "");
export const maskedAadhaar = (last4?: string) => (last4 ? `XXXX XXXX ${last4}` : "");
export const contactOf = (r?: { mobile?: string; mobile_last4?: string }) => r?.mobile || maskedMobile(r?.mobile_last4);

// Number in the international format wa.me expects (10-digit Indian numbers get 91).
export function waNumber(v?: string) {
  const d = digits(v);
  return d.length === 10 ? `91${d}` : d;
}

// Days until the next yearly occurrence of a date (0 = today), or null if unparsable.
export function daysUntil(d?: string): number | null {
  const date = parseDate(d);
  if (!date) return null;
  const today = startOfDay(new Date());
  let next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
  if (next.getTime() < today.getTime()) next = new Date(today.getFullYear() + 1, date.getMonth(), date.getDate());
  return Math.round((next.getTime() - today.getTime()) / 86400000);
}
