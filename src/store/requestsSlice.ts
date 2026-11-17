import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { request } from "@/src/api";
import { addListCases, cleanParams, emptyList, Entry, ListArgs, ListState } from "@/src/store/list";
import type { Envelope, Paginated, PartnerRequestDetail, PartnerRequestRow, PartnerRequestType } from "@/src/types";

// Partner requests ("Request for Documents", payment queries, …) — only the signed-in user's own.
type RequestsState = { types: Entry<PartnerRequestType[]>; list: ListState<PartnerRequestRow>; byId: Record<number, Entry<PartnerRequestDetail>> };
const initialState: RequestsState = { types: { status: "idle" }, list: emptyList<PartnerRequestRow>(), byId: {} };
type Root = { requests: RequestsState };

export const fetchRequestTypes = createAsyncThunk("requests/types", async () => (await request<Envelope<PartnerRequestType[]>>("/partner-request-types")).data ?? [], {
  condition: (_: void, { getState }) => !["loading", "succeeded"].includes((getState() as Root).requests.types.status),
});
// GET /api/partner-requests — status, priority, page.
export const fetchRequests = createAsyncThunk("requests/list", async ({ params, page = 1 }: ListArgs) => (await request<Envelope<Paginated<PartnerRequestRow>>>("/partner-requests", { query: { ...cleanParams(params), page } })).data);
export const fetchRequest = createAsyncThunk("requests/detail", async (id: number) => (await request<Envelope<PartnerRequestDetail>>(`/partner-requests/${id}`)).data);

export type RequestInput = { request_type_id: number; remarks: string; inventory_id?: number; priority?: string };
export const createRequest = createAsyncThunk("requests/create", async (body: RequestInput) => (await request<Envelope<{ id: number }>>("/partner-requests", { method: "POST", body })).data);

const slice = createSlice({
  name: "requests",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    addListCases(b, fetchRequests, (s) => s.list);
    b.addCase(fetchRequestTypes.pending, (s) => {
      s.types = { ...s.types, status: "loading", error: undefined };
    })
      .addCase(fetchRequestTypes.fulfilled, (s, a) => {
        s.types = { data: a.payload, status: "succeeded" };
      })
      .addCase(fetchRequestTypes.rejected, (s, a) => {
        s.types = { ...s.types, status: "failed", error: a.error.message };
      })
      .addCase(fetchRequest.pending, (s, a) => {
        s.byId[a.meta.arg] = { ...s.byId[a.meta.arg], status: "loading", error: undefined };
      })
      .addCase(fetchRequest.fulfilled, (s, a) => {
        s.byId[a.meta.arg] = { data: a.payload, status: "succeeded" };
      })
      .addCase(fetchRequest.rejected, (s, a) => {
        s.byId[a.meta.arg] = { ...s.byId[a.meta.arg], status: "failed", error: a.error.message };
      })
      .addCase(createRequest.fulfilled, (s) => {
        s.list.status = "idle";
      });
  },
});

export default slice.reducer;
