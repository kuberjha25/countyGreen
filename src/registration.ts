import { ApiError } from "@/src/api";
import type { CpDocument } from "@/src/types";

// Draft keys sent to POST /api/registrations (employee_name is only for display).
export const REGISTRATION_FIELDS = ["partner_type", "first_name", "last_name", "mobile", "email", "address", "city", "state", "pincode", "knows_employee", "employee_id", "company_name", "business_type", "facebook_link", "instagram_link", "youtube_link"];

/** The registration request fields from the wizard draft (empty values left out). */
export const registrationValues = (draft: Record<string, string | undefined>) =>
  Object.fromEntries(
    REGISTRATION_FIELDS.map((k) => [k, draft[k] ?? ""]).filter(([k, v]) => v !== "" && !(k === "employee_id" && draft.knows_employee !== "yes")),
  ) as Record<string, string>;

/** Serialisable API failure — what the register thunks reject with, so `.unwrap()` keeps the field errors. */
export type ApiFailure = { message: string; status: number; errors?: Record<string, string[]> };
export const toApiFailure = (e: unknown): ApiFailure =>
  e instanceof ApiError
    ? { message: e.message, status: e.status, errors: e.errors }
    : { message: (e as { message?: string })?.message || "Something went wrong", status: 0 };

/** Documents the API rejected the registration for: field_key → { name, message }. */
export type RequiredDocs = Record<string, { name: string; message: string }>;

const humanize = (key: string) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const lower = (v?: string) => String(v ?? "").toLowerCase();

/**
 * Splits a failed registration's Laravel 422 into the documents it asks for
 * (`documents.<field_key>`, `documents[<field_key>]`, a bare field_key, or a
 * `documents` message naming a document) and every other field error.
 */
export function readRegistrationErrors(e: unknown, knownDocs: Pick<CpDocument, "field_key" | "name">[]) {
  const { message, errors } = (e ?? {}) as Partial<ApiFailure>;
  const docs: RequiredDocs = {};
  const others: { key: string; message: string }[] = [];
  const byKey = Object.fromEntries(knownDocs.map((d) => [d.field_key, d]));
  const byName = (text: string) => knownDocs.find((d) => d.name && lower(text).includes(lower(d.name)));
  const addDoc = (key: string, msg: string) => {
    docs[key] = { name: byKey[key]?.name || humanize(key), message: msg };
  };
  Object.entries(errors ?? {}).forEach(([key, value]) => {
    const msg = String((Array.isArray(value) ? value[0] : value) ?? "");
    const nested = key.match(/^documents?(?:\.|\[)([^.\]]+)/);
    if (nested) return addDoc(nested[1], msg);
    if (byKey[key]) return addDoc(key, msg);
    if (/^documents?$/.test(key)) {
      const named = byName(msg);
      if (named) return addDoc(named.field_key, msg);
    }
    others.push({ key, message: msg });
  });
  if (!errors && message) {
    const named = byName(message);
    if (named) addDoc(named.field_key, message);
  }
  return { docs, others };
}

/** Every document name known from GET /cp-documents (any business type). */
export const knownDocsFrom = (byType: Record<string, { data?: CpDocument[] } | undefined>) => {
  const out: CpDocument[] = [];
  Object.values(byType).forEach((entry) => (entry?.data ?? []).forEach((d) => !out.some((o) => o.field_key === d.field_key) && out.push(d)));
  return out;
};
