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
type Options = { method?: "GET" | "POST" | "PUT" | "PATCH"; query?: Query; body?: unknown; form?: FormData; auth?: boolean };

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

// Multipart uploads go through XMLHttpRequest, not fetch: Expo (SDK 52+) replaces the global fetch
// with expo/fetch, whose FormData encoder rejects React Native file parts ({ uri, name, type }) with
// "Unsupported FormDataPart implementation" before anything is sent — on Android and iOS alike.
// React Native's XMLHttpRequest streams those file parts natively (and on web it sends File parts as usual).
function sendForm(method: string, url: string, headers: Record<string, string>, form: FormData): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v)); // no Content-Type: XHR adds the multipart boundary
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText ?? "" });
    xhr.onerror = () => reject(new Error("Network request failed"));
    xhr.ontimeout = () => reject(new Error("Request timed out"));
    xhr.send(form);
  });
}

export async function request<T = any>(path: string, { method = "GET", query, body, form, auth = true }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = auth ? await getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  // GET never carries a body: the hosting firewall answers GET-with-body with an HTML 403.
  let payload: BodyInit | undefined;
  const multipart = method !== "GET" && !!form;
  if (!multipart && method !== "GET" && body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const url = `${BASE_URL}/api${path}${qs(query)}`;
  const started = Date.now();
  logRequest(method, url, !!token, form ? formSummary(form) : body);
  let status: number;
  let text: string;
  try {
    if (multipart) ({ status, text } = await sendForm(method, url, headers, form!));
    else {
      const res = await fetch(url, { method, headers, body: payload });
      status = res.status;
      text = await res.text();
    }
  } catch (e) {
    logFailure(method, url, started, `NETWORK ERROR ${(e as Error)?.message ?? e}`);
    throw new ApiError(0, multipart ? "The upload could not be sent. Please check your connection and try again." : "You appear to be offline. Please check your connection.");
  }
  const ok = status >= 200 && status < 300;
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: ok ? "Unexpected response from the server." : status === 413 ? "The file is too large to upload." : `Server error (${status}). Please try again.` };
  }
  logResponse(method, url, status, started, data, text);

  if (!ok || data?.status === false || data?.success === false) {
    if (status === 401 && token) onUnauthorized?.();
    const firstField = data?.errors && Object.values<string[]>(data.errors)[0]?.[0];
    throw new ApiError(status, firstField || data?.message || `Request failed (${status})`, data?.errors);
  }
  return data as T;
}

// Works for thrown Errors and for Redux's serialized thunk errors ({ message, name }) from .unwrap().
export const errorMessage = (e: unknown) =>
  typeof e === "string" ? e : e && typeof (e as { message?: unknown }).message === "string" && (e as { message: string }).message ? (e as { message: string }).message : "Something went wrong";

// India Post PIN lookup → the PIN's place (`districts` = every district / region its post offices
// are filed under), `{ found: false }` for an unknown PIN, or null when the service can't be reached.
export type PincodePlace = { found: true; city: string; state: string; districts: string[] } | { found: false };
export async function lookupPincode(pin: string): Promise<PincodePlace | null> {
  if (!/^\d{6}$/.test(pin)) return null;
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const json = await res.json();
    const entry = Array.isArray(json) ? json[0] : json;
    const offices: { District?: string; Region?: string; State?: string }[] = entry?.Status === "Success" ? entry.PostOffice ?? [] : [];
    if (!offices.length) return { found: false };
    const districts = [...new Set(offices.flatMap((o) => [o.District, o.Region]).filter((v): v is string => !!v))];
    return { found: true, city: offices[0].District ?? "", state: offices[0].State ?? "", districts };
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
