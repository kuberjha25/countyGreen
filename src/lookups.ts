import { useQuery } from "@tanstack/react-query";

import { get } from "@/src/api";
import { CATEGORIES, CONFIGURATIONS, DOCUMENT_REQUEST_TYPES, LEAD_SOURCES, LEAD_STATUSES, NEXT_ACTIONS } from "@/src/brand";

// Option lists used by the lead forms. They are served by GET /lookups so the
// admin panel can manage them; the built-in lists are used until the backend
// answers (or if it does not implement the endpoint yet).
export type Lookups = {
  customer_categories: string[];
  configurations: string[];
  lead_sources: string[];
  lead_statuses: string[];
  next_actions: string[];
  document_request_types: string[];
};

export const DEFAULT_LOOKUPS: Lookups = {
  customer_categories: CATEGORIES,
  configurations: CONFIGURATIONS,
  lead_sources: LEAD_SOURCES,
  lead_statuses: LEAD_STATUSES,
  next_actions: NEXT_ACTIONS,
  document_request_types: DOCUMENT_REQUEST_TYPES,
};

export function useLookups(): Lookups {
  const q = useQuery({ queryKey: ["lookups"], queryFn: () => get<Partial<Lookups>>("/lookups"), staleTime: 10 * 60 * 1000, retry: false });
  const data = q.data ?? {};
  const pick = (k: keyof Lookups) => (Array.isArray(data[k]) && data[k]!.length ? data[k]! : DEFAULT_LOOKUPS[k]);
  return {
    customer_categories: pick("customer_categories"),
    configurations: pick("configurations"),
    lead_sources: pick("lead_sources"),
    lead_statuses: pick("lead_statuses"),
    next_actions: pick("next_actions"),
    document_request_types: pick("document_request_types"),
  };
}
