import type { ApiPartnerType } from "@/src/types";

// County Green brand assets & copy (from the supplied creatives). All business data —
// leads, visits, projects, products, documents, news, option lists — comes from the API.
export const IMAGES: Record<string, any> = {
  "hero-security": require("../assets/images/cg/hero-security.jpg"),
  "hero-sunset": require("../assets/images/cg/hero-sunset.jpg"),
  "hero-fountain": require("../assets/images/cg/hero-fountain.jpg"),
};

export const LOGO = require("../assets/images/cg/logo.png");
export const LOGO_WHITE = require("../assets/images/cg/logo-white.png");
export const LEAF = require("../assets/images/cg/leaf.png");

export const BRAND = {
  name: "County Green",
  location: "New Chandigarh",
  tagline: "Home That Comes With More",
  positioning: "First Township from North of Chandigarh",
};

export type PartnerType = "Channel Partner" | "Broker" | "Influencer" | "Freelancer";

export const PARTNER_TYPES: { key: PartnerType; short: string; icon: string; api: ApiPartnerType }[] = [
  { key: "Channel Partner", short: "CP", icon: "people-outline", api: "channel_partner" },
  { key: "Broker", short: "Broker", icon: "briefcase-outline", api: "broker" },
  { key: "Influencer", short: "Influencer", icon: "sparkles-outline", api: "influencer" },
  { key: "Freelancer", short: "Freelancer", icon: "person-outline", api: "freelancer" },
];
// API value (channel_partner) ↔ display name (Channel Partner).
export const partnerTypeName = (api?: string | null) => PARTNER_TYPES.find((p) => p.api === api || p.key === api)?.key ?? api ?? "—";

// Indian states & union territories (address forms).
export const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

// Image from the API, or nothing (no stand-in photos) when the server has none.
export const imageSource = (url?: string | null) => (url ? { uri: url } : undefined);
