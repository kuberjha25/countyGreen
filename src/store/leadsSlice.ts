import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { request } from "@/src/api";
import { addListCases, emptyList, Entry, ListArgs, ListState, cleanParams } from "@/src/store/list";
import type { Envelope, LeadDetail, LeadRow, Paginated } from "@/src/types";

// Leads are scoped by the server to the caller's access level (partners see only theirs).
type LeadsState = { list: ListState<LeadRow>; byId: Record<number, Entry<LeadDetail>> };
const initialState: LeadsState = { list: emptyList<LeadRow>(), byId: {} };

// GET /api/leads — search, status, lead_type, date_filter / start_date / end_date, page.
// (source is not supported by the server yet, so it is filtered on the device.)
export const fetchLeads = createAsyncThunk("leads/list", async ({ params, page = 1 }: ListArgs) => {
  const { source, ...rest } = cleanParams(params);
  return (await request<Envelope<Paginated<LeadRow>>>("/leads", { query: { ...rest, page } })).data;
});

export const fetchLead = createAsyncThunk("leads/detail", async (id: number) => (await request<Envelope<LeadDetail>>(`/leads/${id}`)).data);

export type LeadInput = {
  full_name: string;
  mobile: string;
  email?: string;
  lead_type: string;
  source?: string;
  unit_category?: number;
  budget?: number;
  project_id?: number;
  partner_id?: number;
  address?: string;
  state?: string;
  city?: string;
  remarks?: string;
  status?: string;
};
export const createLead = createAsyncThunk("leads/create", async (body: LeadInput) => (await request<Envelope<LeadDetail>>("/leads", { method: "POST", body })).data);
export const updateLead = createAsyncThunk("leads/update", async ({ id, body }: { id: number; body: Partial<LeadInput> }) => (await request<Envelope<LeadDetail>>(`/leads/${id}`, { method: "PUT", body })).data);

export type FollowupInput = { followup_date: string; remarks: string; followup_time?: string; activity?: string; status?: string; lead_type?: string };
export const addFollowup = createAsyncThunk("leads/followup", async ({ id, body }: { id: number; body: FollowupInput }) => (await request<Envelope<unknown>>(`/leads/${id}/followups`, { method: "POST", body })).data);

const slice = createSlice({
  name: "leads",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    addListCases(b, fetchLeads, (s) => s.list);
    b.addCase(fetchLead.pending, (s, a) => {
      s.byId[a.meta.arg] = { ...s.byId[a.meta.arg], status: "loading", error: undefined };
    })
      .addCase(fetchLead.fulfilled, (s, a) => {
        s.byId[a.meta.arg] = { data: a.payload, status: "succeeded" };
      })
      .addCase(fetchLead.rejected, (s, a) => {
        s.byId[a.meta.arg] = { ...s.byId[a.meta.arg], status: "failed", error: a.error.message };
      });
    // Any change makes the list and that lead stale; screens refetch when status is "idle".
    const stale = (s: LeadsState, id?: number) => {
      s.list.status = "idle";
      if (id && s.byId[id]) s.byId[id].status = "idle";
    };
    b.addCase(createLead.fulfilled, (s) => stale(s))
      .addCase(updateLead.fulfilled, (s, a) => stale(s, a.meta.arg.id))
      .addCase(addFollowup.fulfilled, (s, a) => stale(s, a.meta.arg.id));
  },
});

export default slice.reducer;
