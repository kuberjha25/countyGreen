import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Platform } from "react-native";

import { ApiError, getToken, request, setToken } from "@/src/api";
import type { Envelope, ProfileStats, User } from "@/src/types";

type Profile = { user: User; stats: ProfileStats | null };
// Self-registration answers collected across the profile steps (submitted once, at the end).
export type RegistrationDraft = Record<string, string>;

type AuthState = {
  ready: boolean; // session restored (or not) on launch
  token: string | null;
  user: User | null;
  stats: ProfileStats | null;
  sessionError?: string; // profile could not be loaded (e.g. offline) — splash offers retry
  mobile: string; // verified mobile of a new user, for self-registration
  isNewUser: boolean;
  draft: RegistrationDraft;
  registrationMessage?: string; // server message after self-registration (e.g. pending approval)
};

const initialState: AuthState = { ready: false, token: null, user: null, stats: null, mobile: "", isNewUser: false, draft: {} };
const deviceType = Platform.OS === "ios" ? "ios" : "android";

const loadProfile = async (): Promise<Profile> => {
  const r = await request<Envelope<{ user: User; stats?: ProfileStats }>>("/auth/profile");
  return { user: r.data.user, stats: r.data.stats ?? null };
};

export const restoreSession = createAsyncThunk("auth/restore", async () => {
  const token = await getToken();
  if (!token) return { token: null, profile: null, error: undefined };
  try {
    return { token, profile: await loadProfile(), error: undefined };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      await setToken(null);
      return { token: null, profile: null, error: undefined };
    }
    return { token, profile: null, error: (e as Error).message };
  }
});

export const sendOtp = createAsyncThunk("auth/sendOtp", async (mobile: string) => request<{ message: string }>("/auth/send-otp", { method: "POST", body: { mobile }, auth: false }));

export const verifyOtp = createAsyncThunk("auth/verifyOtp", async ({ mobile, otp }: { mobile: string; otp: string }) => {
  const r = await request<{ is_new_user: boolean; token: string | null; user: User | null }>("/auth/verify-otp", { method: "POST", body: { mobile, otp, device_type: deviceType }, auth: false });
  if (r.is_new_user || !r.token) return { mobile, isNewUser: true as const, token: null, profile: null };
  await setToken(r.token);
  return { mobile, isNewUser: false as const, token: r.token, profile: await loadProfile() };
});

export const fetchProfile = createAsyncThunk("auth/profile", loadProfile);

export const updateProfile = createAsyncThunk("auth/updateProfile", async (body: Record<string, string>) => {
  await request("/auth/profile", { method: "PUT", body });
  return loadProfile();
});

// POST /api/registrations — JSON for broker / influencer / freelancer, multipart for channel partners (documents).
export const selfRegister = createAsyncThunk("auth/selfRegister", async (payload: FormData | Record<string, string>) => {
  const r = await request<{ token?: string; message: string }>("/registrations", payload instanceof FormData ? { method: "POST", form: payload, auth: false } : { method: "POST", body: payload, auth: false });
  // The registration is saved once this POST succeeds. A new partner is "pending approval",
  // so the profile may not load yet — that must not turn a successful submit into an error.
  let profile: Profile | null = null;
  if (r.token) {
    await setToken(r.token);
    try {
      profile = await loadProfile();
    } catch {
      profile = null;
    }
  }
  return { token: r.token ?? null, profile, message: r.message || "Registration submitted and pending approval." };
});

export const logout = createAsyncThunk("auth/logout", async () => {
  await setToken(null);
});

const slice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    updateDraft: (s, a: PayloadAction<RegistrationDraft>) => {
      s.draft = { ...s.draft, ...a.payload };
    },
    sessionExpired: (s) => ({ ...initialState, ready: s.ready }),
  },
  extraReducers: (b) => {
    b.addCase(restoreSession.pending, (s) => {
      s.ready = false;
      s.sessionError = undefined;
    })
      .addCase(restoreSession.fulfilled, (s, a) => {
        s.ready = true;
        s.token = a.payload.token;
        s.user = a.payload.profile?.user ?? null;
        s.stats = a.payload.profile?.stats ?? null;
        s.sessionError = a.payload.error;
      })
      .addCase(restoreSession.rejected, (s, a) => {
        s.ready = true;
        s.sessionError = a.error.message;
      })
      .addCase(verifyOtp.fulfilled, (s, a) => {
        s.mobile = a.payload.mobile;
        s.isNewUser = a.payload.isNewUser;
        s.draft = a.payload.isNewUser ? { mobile: a.payload.mobile } : {};
        s.token = a.payload.token;
        s.user = a.payload.profile?.user ?? null;
        s.stats = a.payload.profile?.stats ?? null;
      })
      .addCase(fetchProfile.fulfilled, (s, a) => {
        s.user = a.payload.user;
        s.stats = a.payload.stats;
      })
      .addCase(updateProfile.fulfilled, (s, a) => {
        s.user = a.payload.user;
        s.stats = a.payload.stats;
      })
      .addCase(selfRegister.fulfilled, (s, a) => {
        s.token = a.payload.token;
        s.user = a.payload.profile?.user ?? null;
        s.stats = a.payload.profile?.stats ?? null;
        s.isNewUser = false;
        s.draft = {};
        s.registrationMessage = a.payload.message;
      })
      .addCase(logout.fulfilled, () => ({ ...initialState, ready: true }));
  },
});

export const { updateDraft, sessionExpired } = slice.actions;
export default slice.reducer;
