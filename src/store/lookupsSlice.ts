import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { request } from "@/src/api";
import type { Entry } from "@/src/store/list";
import type { CpDocument, Envelope, Option, Paginated, Reference, TimeSlot } from "@/src/types";

// Admin-configured option lists (managed in the County Green admin panel).
type LookupsState = {
  sources: Entry<Option[]>;
  categories: Entry<Option[]>;
  timeSlots: Entry<TimeSlot[]>;
  cpDocuments: Entry<CpDocument[]>;
};
const idle = { status: "idle" as const };
const initialState: LookupsState = { sources: idle, categories: idle, timeSlots: idle, cpDocuments: idle };

type Root = { lookups: LookupsState };
const notLoaded = (key: keyof LookupsState) => (_arg: void, { getState }: { getState: () => unknown }) => {
  const st = (getState() as Root).lookups[key].status;
  return st !== "loading" && st !== "succeeded";
};

export const fetchSources = createAsyncThunk("lookups/sources", async () => (await request<Envelope<Option[]>>("/leads/sources")).data, { condition: notLoaded("sources") });
export const fetchCategories = createAsyncThunk("lookups/categories", async () => (await request<Envelope<Option[]>>("/leads/categories")).data, { condition: notLoaded("categories") });
export const fetchTimeSlots = createAsyncThunk("lookups/timeSlots", async () => (await request<Envelope<TimeSlot[]>>("/visits/time-slots")).data, { condition: notLoaded("timeSlots") });
// Public: needed during self-registration, before the partner has a token.
export const fetchCpDocuments = createAsyncThunk("lookups/cpDocuments", async () => (await request<Envelope<CpDocument[]>>("/cp-documents", { auth: false })).data, { condition: notLoaded("cpDocuments") });

// Reference / employee picker (partners and staff). user_type=backoffice limits it to staff.
export const searchReferences = createAsyncThunk("lookups/references", async ({ search, userType, page = 1 }: { search?: string; userType?: "backoffice"; page?: number }) =>
  (await request<Envelope<Paginated<Reference>>>("/leads/references", { query: { search, user_type: userType, page } })).data,
);

const slice = createSlice({
  name: "lookups",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    const wire = <K extends keyof LookupsState>(key: K, thunk: any) =>
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
    wire("cpDocuments", fetchCpDocuments);
  },
});

export default slice.reducer;
