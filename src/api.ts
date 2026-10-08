import { storage } from "@/src/utils/storage";
import type { Permissions } from "@/src/access";
import { mockRequest } from "@/src/mock";

export const TOKEN_KEY = "cg_access_token";
const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
const STATIC_MODE = process.env.EXPO_PUBLIC_STATIC_MODE === "1" || !BASE;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  if (STATIC_MODE) {
    const body = typeof options.body === "string" ? JSON.parse(options.body) : undefined;
    return mockRequest(options.method ?? "GET", path, body) as Promise<T>;
  }

  const token = await storage.secureGet<string | null>(TOKEN_KEY, null);
  const headers: Record<string, string> = { "Content-Type": "application/json", ...((options.headers as Record<string, string>) || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${BASE}/api${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, "You appear to be offline. Please check your connection.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = typeof data?.detail === "string" ? data.detail : Array.isArray(data?.detail) ? data.detail[0]?.msg ?? "Invalid input" : "Request failed";
    throw new ApiError(res.status, detail);
  }
  return data as T;
}

export const get = <T = any>(path: string) => api<T>(path);
export const post = <T = any>(path: string, body?: unknown) => api<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
export const put = <T = any>(path: string, body: unknown) => api<T>(path, { method: "PUT", body: JSON.stringify(body) });
export const patch = <T = any>(path: string, body: unknown) => api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const del = <T = any>(path: string) => api<T>(path, { method: "DELETE" });

export type User = {
  id: string;
  kind?: "partner" | "staff"; // staff = County Green employees (incl. Admin)
  role_id?: string;
  role_name?: string;
  permissions?: Permissions; // resolved from the role on every /me
  active?: boolean;
  phone: string;
  country_code?: string;
  mobile?: string;
  partner_type?: string;
  entity_type?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  company_name?: string;
  experience?: string;
  specialisation?: string;
  knows_employee?: boolean;
  associated_employee?: string;
  social?: { facebook?: string; instagram?: string; youtube?: string };
  followers?: string;
  documents?: { type: string; status: string; file_name?: string }[];
  city?: string;
  state?: string;
  dob?: string; // "DD MMM YYYY" — used for birthday greetings
  anniversary?: string;
  profile_step?: number;
  profile_completed?: boolean;
  created_at?: string;
};
