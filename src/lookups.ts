import { useEffect, useMemo } from "react";

import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchProjects } from "@/src/store/catalogSlice";
import type { Entry } from "@/src/store/list";
import { fetchBusinessTypes, fetchCategories, fetchCities, fetchCpDocuments, fetchLeadStatuses, fetchSources, fetchStates, fetchTimeSlots } from "@/src/store/lookupsSlice";
import type { CityItem, CpDocument } from "@/src/types";

// Admin-managed option lists, loaded once into Redux and shared by every screen.
export function useSources() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchSources());
  }, [dispatch]);
  return useAppSelector((s) => s.lookups.sources);
}

export function useCategories() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);
  return useAppSelector((s) => s.lookups.categories);
}

export function useTimeSlots() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchTimeSlots());
  }, [dispatch]);
  return useAppSelector((s) => s.lookups.timeSlots);
}

// GET /api/business-types — show `name`, send `slug` as business_type.
export function useBusinessTypes() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchBusinessTypes());
  }, [dispatch]);
  return useAppSelector((s) => s.lookups.businessTypes);
}

// Documents required for the chosen business type; reloads when the type changes.
const NO_DOCS: Entry<CpDocument[]> = { status: "idle" };
export function useCpDocuments(businessType?: string) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (businessType) dispatch(fetchCpDocuments(businessType));
  }, [dispatch, businessType]);
  return useAppSelector((s) => (businessType ? s.lookups.cpDocuments[businessType] : undefined)) ?? NO_DOCS;
}

// Documents of every business type, merged (deduped by field_key), for showing the upload
// list before a type is chosen. `requiredFor` = names of the types that make it mandatory.
export type MergedCpDocument = CpDocument & { requiredFor: string[] };
export function useAllCpDocuments(enabled: boolean) {
  const dispatch = useAppDispatch();
  const types = useBusinessTypes();
  const byType = useAppSelector((s) => s.lookups.cpDocuments);
  const list = useMemo(() => types.data ?? [], [types.data]);
  const slugs = list.map((t) => t.slug).join(",");
  useEffect(() => {
    if (enabled) slugs.split(",").filter(Boolean).forEach((slug) => dispatch(fetchCpDocuments(slug)));
  }, [dispatch, enabled, slugs]);
  return useMemo(() => {
    const merged: MergedCpDocument[] = [];
    const seen: Record<string, MergedCpDocument> = {};
    list.forEach((t) =>
      (byType[t.slug]?.data ?? []).forEach((d) => {
        if (!seen[d.field_key]) merged.push((seen[d.field_key] = { ...d, requiredFor: [] }));
        if (d.is_mandatory) seen[d.field_key].requiredFor.push(t.name);
      })
    );
    const loading =
      !merged.length && (types.status === "loading" || types.status === "idle" || list.some((t) => ["loading", "idle", undefined].includes(byType[t.slug]?.status)));
    return { data: merged, loading };
  }, [list, byType, types.status]);
}

// Statuses staff can set on a lead (PUT /api/leads/{id} status).
export function useLeadStatuses() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchLeadStatuses());
  }, [dispatch]);
  return useAppSelector((s) => s.lookups.leadStatuses);
}

export function useStates() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchStates());
  }, [dispatch]);
  return useAppSelector((s) => s.lookups.states);
}

const NO_CITIES: Entry<CityItem[]> = { status: "idle" };
export function useCities(stateId?: number) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (stateId) dispatch(fetchCities(stateId));
  }, [dispatch, stateId]);
  return useAppSelector((s) => (stateId ? s.lookups.cities[stateId] : undefined)) ?? NO_CITIES;
}

export function useProjects() {
  const dispatch = useAppDispatch();
  const projects = useAppSelector((s) => s.catalog.projects);
  useEffect(() => {
    if (projects.status === "idle") dispatch(fetchProjects());
  }, [dispatch, projects.status]);
  return projects;
}
