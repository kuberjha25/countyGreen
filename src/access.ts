import type { User } from "@/src/types";

// What the signed-in user can do in the app. The server enforces the real role
// permissions; here staff (user_type "backoffice") get every action the API offers,
// and CP / Broker / Influencer / Freelancer logins ("frontend") are view-only for
// leads and project visits (client requirement).
export type ModuleKey = "leads" | "visits" | "registrations" | "products" | "documents" | "admin";
export type Action = "view" | "add" | "edit" | "modify" | "delete" | "assign" | "reassign";

const PARTNER: Partial<Record<ModuleKey, Action[]>> = {
  leads: ["view"],
  visits: ["view"],
  products: ["view", "add"],
  documents: ["view"],
};

export const isStaff = (user: User | null | undefined) => user?.user_type === "backoffice";
export const isSuperAdmin = (user: User | null | undefined) => user?.role?.slug === "super-admin";
export const can = (user: User | null | undefined, module: ModuleKey, action: Action) => (!user ? false : isStaff(user) ? true : !!PARTNER[module]?.includes(action));
