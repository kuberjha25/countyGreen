import { useQuery } from "@tanstack/react-query";

import { get } from "@/src/api";
import { CATEGORIES, CONFIGURATIONS, DEFAULT_REG_DOCS, DOCUMENT_REQUEST_TYPES, LEAD_SOURCES, LEAD_STATUSES, MasterKey, NEXT_ACTIONS, RegDocConfig, TIME_SLOTS } from "@/src/brand";

// Option lists used across the app. They are served by GET /lookups and
// managed by Admin (Admin → Masters); the built-in lists are used until the
// data answers (or if a backend does not implement the endpoint yet).
export type Lookups = Record<MasterKey, string[]> & { next_actions: string[]; document_request_types: string[]; lead_statuses: string[] };

export const DEFAULT_LOOKUPS: Lookups = {
  customer_categories: CATEGORIES,
  configurations: CONFIGURATIONS,
  lead_sources: LEAD_SOURCES,
  time_slots: TIME_SLOTS,
  next_actions: NEXT_ACTIONS,
  document_request_types: DOCUMENT_REQUEST_TYPES,
  lead_statuses: LEAD_STATUSES,
};

export function useLookups(): Lookups {
  const q = useQuery({ queryKey: ["lookups"], queryFn: () => get<Partial<Lookups>>("/lookups"), staleTime: 60 * 1000, retry: false });
  const data = q.data ?? {};
  const pick = (k: keyof Lookups) => (Array.isArray(data[k]) && data[k]!.length ? data[k]! : DEFAULT_LOOKUPS[k]);
  return Object.fromEntries(Object.keys(DEFAULT_LOOKUPS).map((k) => [k, pick(k as keyof Lookups)])) as Lookups;
}

// Registration document rules set by Admin (Admin → CP Registration Documents).
export function useRegDocs(): RegDocConfig[] {
  const q = useQuery({ queryKey: ["reg-documents"], queryFn: () => get<RegDocConfig[]>("/reg-documents"), staleTime: 60 * 1000, retry: false });
  return q.data?.length ? q.data : DEFAULT_REG_DOCS;
}

export type Partner = { id: string; name: string; partner_type: string; mobile: string; company?: string; dob?: string; anniversary?: string; associated_employee?: string };

// CP / Broker / Influencer / Freelancer directory (registered partner logins + registrations).
export function usePartners(enabled = true) {
  return useQuery({ queryKey: ["partners"], queryFn: () => get<Partner[]>("/partners"), enabled });
}

export type Staff = { id: string; name: string; role_id: string; role_name: string; phone: string; active: boolean };

export function useStaff(enabled = true) {
  return useQuery({ queryKey: ["employees"], queryFn: () => get<Staff[]>("/employees"), enabled });
}
