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
