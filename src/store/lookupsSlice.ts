import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { ApiError, request } from "@/src/api";
import type { Entry } from "@/src/store/list";
import type { BusinessType, CityItem, CpDocument, Envelope, Option, Paginated, Reference, StateItem, TimeSlot } from "@/src/types";

// Admin-configured option lists (managed in the County Green admin panel), loaded once per session.
type Simple = "sources" | "categories" | "timeSlots" | "businessTypes" | "leadStatuses" | "states";
type LookupsState = {
  sources: Entry<Option[]>;
  categories: Entry<Option[]>;
  timeSlots: Entry<TimeSlot[]>;
  businessTypes: Entry<BusinessType[]>;
  leadStatuses: Entry<Option[]>;
  states: Entry<StateItem[]>;
  cpDocuments: Record<string, Entry<CpDocument[]>>; // by business type slug
  cities: Record<number, Entry<CityItem[]>>; // by state id
};
const idle = { status: "idle" as const };
const initialState: LookupsState = { sources: idle, categories: idle, timeSlots: idle, businessTypes: idle, leadStatuses: idle, states: idle, cpDocuments: {}, cities: {} };

type Root = { lookups: LookupsState };
const notLoaded = (st?: string) => st !== "loading" && st !== "succeeded";
const once = (key: Simple) => (_arg: void, { getState }: { getState: () => unknown }) => notLoaded((getState() as Root).lookups[key].status);

export const fetchSources = createAsyncThunk("lookups/sources", async () => (await request<Envelope<Option[]>>("/leads/sources")).data, { condition: once("sources") });
export const fetchCategories = createAsyncThunk("lookups/categories", async () => (await request<Envelope<Option[]>>("/leads/categories")).data, { condition: once("categories") });
export const fetchTimeSlots = createAsyncThunk("lookups/timeSlots", async () => (await request<Envelope<TimeSlot[]>>("/visits/time-slots")).data, { condition: once("timeSlots") });

// Public (also used during self-registration, before the partner has a token).
export const fetchBusinessTypes = createAsyncThunk("lookups/businessTypes", async () => (await request<Envelope<BusinessType[]>>("/business-types", { auth: false })).data, { condition: once("businessTypes") });
export const fetchLeadStatuses = createAsyncThunk("lookups/leadStatuses", async () => (await request<Envelope<Option[]>>("/leads/statuses", { auth: false })).data, { condition: once("leadStatuses") });
export const fetchStates = createAsyncThunk("lookups/states", async () => (await request<Envelope<StateItem[]>>("/states", { auth: false })).data, { condition: once("states") });
export const fetchCities = createAsyncThunk("lookups/cities", async (stateId: number) => (await request<Envelope<CityItem[]>>("/cities", { query: { state_id: stateId }, auth: false })).data, {
  condition: (stateId, { getState }) => notLoaded((getState() as Root).lookups.cities[stateId]?.status),
});

// Documents Admin requires for a business type (slug). 404 = none required for that type.
export const fetchCpDocuments = createAsyncThunk(
  "lookups/cpDocuments",
  async (businessType: string) => {
    try {
      return (await request<Envelope<CpDocument[]>>("/cp-documents", { query: { business_type: businessType }, auth: false })).data;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return [];
      throw e;
    }
  },
  { condition: (slug, { getState }) => !!slug && notLoaded((getState() as Root).lookups.cpDocuments[slug]?.status) },
);

// Reference / employee picker (partners and staff). user_type=backoffice limits it to staff.
// `auth: false` during self-registration — the endpoint is public and a stale token can get it refused.
export const searchReferences = createAsyncThunk("lookups/references", async ({ search, userType, page = 1, auth = true }: { search?: string; userType?: "backoffice"; page?: number; auth?: boolean }) =>
  (await request<Envelope<Paginated<Reference>>>("/leads/references", { query: { search, user_type: userType, page }, auth })).data,
);

const slice = createSlice({
  name: "lookups",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    const wire = <K extends Simple>(key: K, thunk: any) =>
      b
        .addCase(thunk.pending, (s) => {
          s[key] = { ...s[key], status: "loading", error: undefined };
        })
        .addCase(thunk.fulfilled, (s, a: any) => {
          s[key] = { data: Array.isArray(a.payload) ? a.payload : [], status: "succeeded" } as LookupsState[K];
        })
        .addCase(thunk.rejected, (s, a: any) => {
          s[key] = { ...s[key], status: "failed", error: a.error.message };
        });
    wire("sources", fetchSources);
    wire("categories", fetchCategories);
    wire("timeSlots", fetchTimeSlots);
    wire("businessTypes", fetchBusinessTypes);
    wire("leadStatuses", fetchLeadStatuses);
    wire("states", fetchStates);
    b.addCase(fetchCpDocuments.pending, (s, a) => {
      s.cpDocuments[a.meta.arg] = { ...s.cpDocuments[a.meta.arg], status: "loading", error: undefined };
    })
      .addCase(fetchCpDocuments.fulfilled, (s, a) => {
        s.cpDocuments[a.meta.arg] = { data: Array.isArray(a.payload) ? a.payload : [], status: "succeeded" };
      })
      .addCase(fetchCpDocuments.rejected, (s, a) => {
        s.cpDocuments[a.meta.arg] = { ...s.cpDocuments[a.meta.arg], status: "failed", error: a.error.message };
      })
      .addCase(fetchCities.pending, (s, a) => {
        s.cities[a.meta.arg] = { ...s.cities[a.meta.arg], status: "loading", error: undefined };
      })
      .addCase(fetchCities.fulfilled, (s, a) => {
        s.cities[a.meta.arg] = { data: Array.isArray(a.payload) ? a.payload : [], status: "succeeded" };
      })
      .addCase(fetchCities.rejected, (s, a) => {
        s.cities[a.meta.arg] = { ...s.cities[a.meta.arg], status: "failed", error: a.error.message };
      });
  },
});

export default slice.reducer;
