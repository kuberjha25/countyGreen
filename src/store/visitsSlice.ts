import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { request } from "@/src/api";
import { addListCases, emptyList, Entry, ListArgs, ListState, cleanParams } from "@/src/store/list";
import type { Envelope, Paginated, VisitDetail, VisitRow } from "@/src/types";

type VisitsState = { list: ListState<VisitRow>; byId: Record<number, Entry<VisitDetail>> };
const initialState: VisitsState = { list: emptyList<VisitRow>(), byId: {} };

// GET /api/visits — status, search, date_filter (visit date), page.
export const fetchVisits = createAsyncThunk("visits/list", async ({ params, page = 1 }: ListArgs) => (await request<Envelope<Paginated<VisitRow>>>("/visits", { query: { ...cleanParams(params), page } })).data);
export const fetchVisit = createAsyncThunk("visits/detail", async (id: number) => (await request<Envelope<VisitDetail>>(`/visits/${id}`)).data);

export type VisitInput = { full_name: string; mobile: string; project_id: number; lead_type: string; visit_date: string; time_slot_id: number; email?: string; address?: string; city?: string; state?: string; remarks?: string };
// Creates (or reuses, by mobile) a lead and schedules the visit.
export const createVisit = createAsyncThunk("visits/create", async (body: VisitInput) => (await request<Envelope<{ id: number; lead_id?: number }>>("/visits", { method: "POST", body })).data);
export const attendVisit = createAsyncThunk("visits/attend", async ({ id, remarks }: { id: number; remarks: string }) => (await request<Envelope<unknown>>(`/visits/${id}/attend`, { method: "POST", body: { remarks } })).data);

const slice = createSlice({
  name: "visits",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    addListCases(b, fetchVisits, (s) => s.list);
    b.addCase(fetchVisit.pending, (s, a) => {
      s.byId[a.meta.arg] = { ...s.byId[a.meta.arg], status: "loading", error: undefined };
    })
      .addCase(fetchVisit.fulfilled, (s, a) => {
        s.byId[a.meta.arg] = { data: a.payload, status: "succeeded" };
      })
      .addCase(fetchVisit.rejected, (s, a) => {
        s.byId[a.meta.arg] = { ...s.byId[a.meta.arg], status: "failed", error: a.error.message };
      })
      .addCase(createVisit.fulfilled, (s) => {
        s.list.status = "idle";
      })
      .addCase(attendVisit.fulfilled, (s, a) => {
        s.list.status = "idle";
        if (s.byId[a.meta.arg.id]) s.byId[a.meta.arg.id].status = "idle";
      });
  },
});

export default slice.reducer;
