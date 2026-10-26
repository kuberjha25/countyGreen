// HTTP client for the County Green backend (Laravel + Sanctum).
// Every call: Accept: application/json, Bearer token when signed in, and the
// { status, message, data } envelope — HTTP non-2xx or status === false is an error.
import { storage } from "@/src/utils/storage";

export const BASE_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || "https://my.countygreen.in").replace(/\/+$/, "");
export const TOKEN_KEY = "cg_access_token";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

let tokenCache: string | null | undefined;
export async function getToken() {
  if (tokenCache === undefined) tokenCache = await storage.secureGet<string | null>(TOKEN_KEY, null);
  return tokenCache;
}
export async function setToken(token: string | null) {
  tokenCache = token;
  if (token) await storage.secureSet(TOKEN_KEY, token);
  else await storage.secureRemove(TOKEN_KEY);
}

// Called once by the store so a 401 anywhere signs the user out.
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => (onUnauthorized = fn);

type Query = Record<string, string | number | boolean | null | undefined>;
type Options = { method?: "GET" | "POST" | "PUT"; query?: Query; body?: unknown; form?: FormData; auth?: boolean };

const qs = (query?: Query) => {
  const parts = Object.entries(query ?? {})
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
};

/* ------------------------------------------------------------------ */
/* Console logs for phone testing — every API call shows in the Metro  */
/* terminal (dev builds) or `adb logcat` (APK built with              */
/* EXPO_PUBLIC_API_LOGS=1). The bearer token is never printed.         */
/* ------------------------------------------------------------------ */
declare const __DEV__: boolean | undefined;
export const API_LOGS = (typeof __DEV__ !== "undefined" && !!__DEV__) || process.env.EXPO_PUBLIC_API_LOGS === "1";
const MAX_LOG = 1500;
const short = (v: unknown) => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s && s.length > MAX_LOG ? `${s.slice(0, MAX_LOG)}… (${s.length} chars)` : s;
};
// Hide secrets that come back in responses (token) — keep everything else visible for testing.
const redact = (data: any) => (data && typeof data === "object" && typeof data.token === "string" ? { ...data, token: `${data.token.slice(0, 4)}…(hidden)` } : data);
const formSummary = (form: FormData) => {
  const parts: Record<string, string> = {};
  (form as any)._parts?.forEach(([k, v]: [string, any]) => (parts[k] = typeof v === "object" ? `[file ${v?.name ?? ""}]` : String(v)));
  return { multipart: parts };
};
function logRequest(method: string, url: string, authed: boolean, body?: unknown) {
  if (!API_LOGS) return;
  console.log(`[API] → ${method} ${url}${authed ? " (auth)" : ""}${body !== undefined ? `\n      body: ${short(body)}` : ""}`);
}
function logResponse(method: string, url: string, status: number, started: number, data: any, text: string) {
  if (!API_LOGS) return;
  const ok = status >= 200 && status < 300 && data?.status !== false && data?.success !== false;
  const line = `[API] ${ok ? "←" : "✖"} ${status} ${method} ${url} (${Date.now() - started} ms)\n      ${data && Object.keys(data).length ? short(redact(data)) : short(text)}`;
  if (ok) console.log(line);
  else console.warn(line);
}
function logFailure(method: string, url: string, started: number, reason: string) {
  if (!API_LOGS) return;
  console.warn(`[API] ✖ ${method} ${url} (${Date.now() - started} ms) ${reason}`);
}

export async function request<T = any>(path: string, { method = "GET", query, body, form, auth = true }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = auth ? await getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  // GET never carries a body: the hosting firewall answers GET-with-body with an HTML 403.
  let payload: BodyInit | undefined;
  if (method !== "GET" && form) payload = form; // multipart boundary is set by fetch
  else if (method !== "GET" && body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const url = `${BASE_URL}/api${path}${qs(query)}`;
  const started = Date.now();
  logRequest(method, url, !!token, form ? formSummary(form) : body);
  let res: Response;
  try {
    res = await fetch(url, { method, headers, body: payload });
  } catch (e) {
    logFailure(method, url, started, `NETWORK ERROR ${(e as Error)?.message ?? e}`);
    throw new ApiError(0, "You appear to be offline. Please check your connection.");
  }
  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: res.ok ? "Unexpected response from the server." : `Server error (${res.status}). Please try again.` };
  }
  logResponse(method, url, res.status, started, data, text);

  if (!res.ok || data?.status === false || data?.success === false) {
    if (res.status === 401 && token) onUnauthorized?.();
    const firstField = data?.errors && Object.values<string[]>(data.errors)[0]?.[0];
    throw new ApiError(res.status, firstField || data?.message || `Request failed (${res.status})`, data?.errors);
  }
  return data as T;
}

// Works for thrown Errors and for Redux's serialized thunk errors ({ message, name }) from .unwrap().
export const errorMessage = (e: unknown) =>
  typeof e === "string" ? e : e && typeof (e as { message?: unknown }).message === "string" && (e as { message: string }).message ? (e as { message: string }).message : "Something went wrong";

// India Post PIN code lookup (public, third party) → city / state.
export async function lookupPincode(pin: string): Promise<{ city: string; state: string } | null> {
  if (!/^\d{6}$/.test(pin)) return null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const json = await res.json();
    const entry = Array.isArray(json) ? json[0] : json;
    const po = entry?.Status === "Success" ? entry.PostOffice?.[0] : null;
    return po ? { city: po.District, state: po.State } : null;
  } catch {
    return null;
  }
}

// FormData file part for React Native / web uploads.
export type PickedFile = { uri: string; name: string; mimeType?: string; file?: File };
const MIME: Record<string, string> = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png" };
export const mimeOf = (f: PickedFile) => f.mimeType || MIME[(f.name.split(".").pop() ?? "").toLowerCase()] || "application/octet-stream";
export function appendFile(form: FormData, field: string, f: PickedFile) {
  if (f.file) form.append(field, f.file, f.name); // web
  else form.append(field, { uri: f.uri, name: f.name, type: mimeOf(f) } as any);
}
