import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { request } from "@/src/api";
import type { Status } from "@/src/store/list";
import type { Envelope, Paginated } from "@/src/types";

// Dashboard counts. There is no stats endpoint for these, so each count is the
// paginator "total" of page 1 of the matching filtered list.
export type Counts = {
  leads: number;
  leadsConverted: number;
  leadsNew: number;
  visits: number;
  visitsScheduled: number;
  visitsCompleted: number;
  registrationsPending?: number;
};
type DashboardState = { counts?: Counts; status: Status; error?: string };
const initialState: DashboardState = { status: "idle" };

const total = async (path: string, query: Record<string, string> = {}) => {
  try {
    return (await request<Envelope<Paginated<unknown>>>(path, { query: { ...query, page: 1 } })).data.total ?? 0;
  } catch {
    return undefined; // e.g. a partner may not access that list
  }
};

export const fetchCounts = createAsyncThunk("dashboard/counts", async (staff: boolean): Promise<Counts> => {
  const [leads, leadsConverted, leadsNew, visits, visitsScheduled, visitsCompleted, registrationsPending] = await Promise.all([
    total("/leads"),
    total("/leads", { status: "converted" }),
    total("/leads", { status: "new" }),
    total("/visits"),
    total("/visits", { status: "scheduled" }),
    total("/visits", { status: "completed" }),
    staff ? total("/registrations", { status: "pending" }) : Promise.resolve(undefined),
  ]);
  return { leads: leads ?? 0, leadsConverted: leadsConverted ?? 0, leadsNew: leadsNew ?? 0, visits: visits ?? 0, visitsScheduled: visitsScheduled ?? 0, visitsCompleted: visitsCompleted ?? 0, registrationsPending };
});

const slice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchCounts.pending, (s) => {
      s.status = "loading";
      s.error = undefined;
    })
      .addCase(fetchCounts.fulfilled, (s, a) => {
        s.counts = a.payload;
        s.status = "succeeded";
      })
      .addCase(fetchCounts.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.error.message;
      });
  },
});

export default slice.reducer;
