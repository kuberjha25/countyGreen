import type { User } from "@/src/api";

// Role based access. Every role (staff roles and the partner role) carries a
// list of allowed actions per module; Admin edits them in Admin → Roles.
// The same permissions drive what the app shows and what the data layer accepts.
// Actions are the ones in the client brief: View, Add, Edit, Delete, Modify, Assign, Reassign.
export const ACTIONS = {
  view: "View",
  add: "Add",
  edit: "Edit",
  modify: "Modify",
  delete: "Delete",
  assign: "Assign",
  reassign: "Reassign",
} as const;
export type Action = keyof typeof ACTIONS;

export const MODULES = [
  { key: "leads", label: "Leads", actions: ["view", "add", "edit", "modify", "delete", "assign", "reassign"], hint: "Edit = customer details · Modify = status & follow-up · Assign = pick staff while adding" },
  { key: "visits", label: "Project Visits", actions: ["view", "add", "modify", "assign"], hint: "Modify = update visit status · Assign = pick staff while adding" },
  { key: "registrations", label: "Registrations", actions: ["view", "add"] },
  { key: "products", label: "Our Products", actions: ["view", "add", "edit", "delete"] },
  { key: "availability", label: "Availability Requests", actions: ["view", "add"], hint: "Add = request availability · View = see all requests" },
  { key: "documents", label: "Documents", actions: ["view", "add"], hint: "Add = upload · staff with View can send on WhatsApp" },
  { key: "greetings", label: "Birthday / Anniversary Greetings", actions: ["view"], hint: "Send greetings on WhatsApp" },
  { key: "masters", label: "Masters", actions: ["view", "add", "edit", "delete"], hint: "Customer category, configuration, lead source, time slot…" },
  { key: "reg_documents", label: "CP Registration Documents", actions: ["view", "edit"] },
  { key: "roles", label: "Roles & Staff", actions: ["view", "add", "edit", "delete", "assign"], hint: "Assign = change a staff member's role" },
  { key: "content", label: "Content (CMS)", actions: ["view", "add", "edit", "delete"] },
  { key: "mis", label: "MIS Reports", actions: ["view"] },
] as const satisfies readonly { key: string; label: string; actions: readonly Action[]; hint?: string }[];
export type ModuleKey = (typeof MODULES)[number]["key"];
export type Permissions = Partial<Record<ModuleKey, Action[]>>;

export type Role = { id: string; name: string; description: string; kind: "staff" | "partner"; system?: boolean; permissions: Permissions };

// CP / Broker / Influencer / Freelancer logins are view-only for leads and
// project visits (client requirement); only these cells can ever be granted to them.
export const PARTNER_ALLOWED: Permissions = {
  leads: ["view"],
  visits: ["view"],
  registrations: ["view", "add"],
  products: ["view"],
  availability: ["add"],
  documents: ["view"],
  mis: ["view"],
};

export const ADMIN_ROLE_ID = "role-admin";
export const PARTNER_ROLE_ID = "role-partner";

const all = (): Permissions => Object.fromEntries(MODULES.map((m) => [m.key, [...m.actions]])) as Permissions;

export const DEFAULT_ROLES: Role[] = [
  { id: ADMIN_ROLE_ID, name: "Admin", description: "Full access to every module and setting.", kind: "staff", system: true, permissions: all() },
  {
    id: "role-sales", name: "Sales Executive", description: "Adds and manages leads and project visits for partners.", kind: "staff",
    permissions: { leads: ["view", "add", "edit", "modify", "delete"], visits: ["view", "add", "modify"], registrations: ["view", "add"], products: ["view"], availability: ["view"], documents: ["view"], greetings: ["view"], mis: ["view"] },
  },
  {
    id: "role-front-office", name: "Front Office", description: "Adds leads and visits when partners bring customers to the office.", kind: "staff",
    permissions: { leads: ["view", "add", "edit", "modify"], visits: ["view", "add", "modify"], products: ["view"], availability: ["view"], documents: ["view"], mis: ["view"] },
  },
  {
    id: "role-crm", name: "CRM Executive", description: "Handles converted customers, documents and partner greetings.", kind: "staff",
    permissions: { leads: ["view", "modify"], visits: ["view"], products: ["view"], availability: ["view"], documents: ["view", "add"], greetings: ["view"], mis: ["view"] },
  },
  { id: PARTNER_ROLE_ID, name: "Partner (CP / Broker / Influencer / Freelancer)", description: "View-only access to their own leads and project visits.", kind: "partner", system: true, permissions: { ...PARTNER_ALLOWED } },
];

export const isLocked = (role: Role, module: ModuleKey, action: Action) =>
  role.id === ADMIN_ROLE_ID || (role.kind === "partner" && !(PARTNER_ALLOWED[module] ?? []).includes(action));

export const can = (user: User | null | undefined, module: ModuleKey, action: Action) => !!user?.permissions?.[module]?.includes(action);
export const isStaff = (user: User | null | undefined) => user?.kind === "staff";

