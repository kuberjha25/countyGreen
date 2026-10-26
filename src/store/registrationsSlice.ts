import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { request } from "@/src/api";
import { addListCases, emptyList, Entry, ListArgs, ListState, cleanParams } from "@/src/store/list";
import type { Envelope, Paginated, RegistrationDetail, RegistrationRow } from "@/src/types";

type RegistrationsState = { list: ListState<RegistrationRow>; byId: Record<number, Entry<RegistrationDetail>> };
const initialState: RegistrationsState = { list: emptyList<RegistrationRow>(), byId: {} };

// GET /api/registrations — status (pending | completed), search, date_filter, page.
export const fetchRegistrations = createAsyncThunk("registrations/list", async ({ params, page = 1 }: ListArgs) =>
  (await request<Envelope<Paginated<RegistrationRow>>>("/registrations", { query: { ...cleanParams(params), page } })).data,
);
export const fetchRegistration = createAsyncThunk("registrations/detail", async (id: number) => (await request<Envelope<RegistrationDetail>>(`/registrations/${id}`)).data);

// Backoffice registers a partner; the partner's mobile is then verified by OTP.
export const adminRegister = createAsyncThunk("registrations/adminCreate", async (payload: FormData | Record<string, string>) =>
  request<{ message: string; requires_otp?: boolean; mobile?: string }>("/admin/registrations", payload instanceof FormData ? { method: "POST", form: payload } : { method: "POST", body: payload }),
);
export const verifyRegistrantOtp = createAsyncThunk("registrations/verifyOtp", async (body: { mobile: string; otp: string }) => request<{ message: string }>("/admin/registrations/verify-otp", { method: "POST", body }));
export const resendRegistrantOtp = createAsyncThunk("registrations/resendOtp", async (mobile: string) => request<{ message: string }>("/admin/registrations/resend-otp", { method: "POST", body: { mobile } }));

const slice = createSlice({
  name: "registrations",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    addListCases(b, fetchRegistrations, (s) => s.list);
    b.addCase(fetchRegistration.pending, (s, a) => {
      s.byId[a.meta.arg] = { ...s.byId[a.meta.arg], status: "loading", error: undefined };
    })
      .addCase(fetchRegistration.fulfilled, (s, a) => {
        s.byId[a.meta.arg] = { data: a.payload, status: "succeeded" };
      })
      .addCase(fetchRegistration.rejected, (s, a) => {
        s.byId[a.meta.arg] = { ...s.byId[a.meta.arg], status: "failed", error: a.error.message };
      })
      .addCase(adminRegister.fulfilled, (s) => {
        s.list.status = "idle";
      })
      .addCase(verifyRegistrantOtp.fulfilled, (s) => {
        s.list.status = "idle";
      });
  },
});

export default slice.reducer;
