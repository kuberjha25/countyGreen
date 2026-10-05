// County Greens brand assets & static copy (sourced from supplied creatives).
export const IMAGES: Record<string, any> = {
  "hero-security": require("../assets/images/cg/hero-security.jpg"),
  "hero-sunset": require("../assets/images/cg/hero-sunset.jpg"),
  "hero-fountain": require("../assets/images/cg/hero-fountain.jpg"),
  amphitheatre: require("../assets/images/cg/amphitheatre.jpg"),
  gym: require("../assets/images/cg/gym.jpg"),
  pharmacy: require("../assets/images/cg/pharmacy.jpg"),
  yoga: require("../assets/images/cg/yoga.jpg"),
  tennis: require("../assets/images/cg/tennis.jpg"),
  "family-lawn": require("../assets/images/cg/family-lawn.jpg"),
  festive: require("../assets/images/cg/festive.jpg"),
  hammock: require("../assets/images/cg/hammock.jpg"),
  play: require("../assets/images/cg/play.jpg"),
  basketball: require("../assets/images/cg/basketball.jpg"),
  "couple-balcony": require("../assets/images/cg/couple-balcony.jpg"),
  sustainable: require("../assets/images/cg/sustainable.jpg"),
  living: require("../assets/images/cg/living.jpg"),
  panoramic: require("../assets/images/cg/panoramic.jpg"),
  private: require("../assets/images/cg/private.jpg"),
  golden: require("../assets/images/cg/golden.jpg"),
  address: require("../assets/images/cg/address.jpg"),
  quiet: require("../assets/images/cg/quiet.jpg"),
  "everyday-moments": require("../assets/images/cg/everyday-moments.jpg"),
  "everyday-experiences": require("../assets/images/cg/everyday-experiences.jpg"),
};

export const LOGO = require("../assets/images/cg/logo.png");
export const LOGO_WHITE = require("../assets/images/cg/logo-white.png");
export const LEAF = require("../assets/images/cg/leaf.png");

export const img = (key?: string) => (key && IMAGES[key]) || IMAGES["hero-security"];

export const BRAND = {
  name: "County Greens",
  location: "New Chandigarh",
  tagline: "Home That Comes With More",
  status: "Arriving Soon",
  positioning: "First Township from North of Chandigarh",
};

export type PartnerType = "Channel Partner" | "Broker" | "Influencer" | "Freelancer";

export const PARTNER_TYPES: { key: PartnerType; short: string; icon: string }[] = [
  { key: "Channel Partner", short: "CP", icon: "people-outline" },
  { key: "Broker", short: "Broker", icon: "briefcase-outline" },
  { key: "Influencer", short: "Influencer", icon: "sparkles-outline" },
  { key: "Freelancer", short: "Freelancer", icon: "person-outline" },
];

export const ENTITY_TYPES = ["Individual", "Proprietorship", "Partnership Firm", "LLP", "Private Limited"];

// What each partner type is asked for during registration. Every screen of the
// profile flow (and New Registration) reads this, so the fields change with
// the "I am a" selection.
type PartnerProfile = {
  entityLabel?: string; // entity type + company/firm name (business partners only)
  experience: boolean;
  specialisation: boolean;
  social: boolean; // social media profiles — influencers only
  rera: "required" | "optional" | false; // always a document upload, never a typed number
  detailsSubtitle: string;
};

export const PARTNER_PROFILE: Record<PartnerType, PartnerProfile> = {
  "Channel Partner": { entityLabel: "Type of channel partner entity", experience: true, specialisation: true, social: false, rera: "required", detailsSubtitle: "A few professional details about your channel partner business." },
  Broker: { entityLabel: "Type of broker entity", experience: true, specialisation: true, social: false, rera: "required", detailsSubtitle: "A few professional details about your brokerage." },
  Influencer: { experience: false, specialisation: false, social: true, rera: false, detailsSubtitle: "Share your social media profiles and audience size." },
  Freelancer: { experience: true, specialisation: true, social: false, rera: "optional", detailsSubtitle: "A few professional details about your work as a freelancer." },
};

export const partnerProfile = (type?: string) => PARTNER_PROFILE[type as PartnerType] ?? PARTNER_PROFILE["Channel Partner"];
export const partnerShort = (type?: string) => PARTNER_TYPES.find((p) => p.key === type)?.short ?? type ?? "—";

export const RERA_CERTIFICATE = "RERA Certificate";

export type DocSpec = { type: string; hint: string; required: boolean };

export function partnerDocuments(type?: string, entity?: string): DocSpec[] {
  const p = partnerProfile(type);
  const docs: DocSpec[] = [{ type: "PAN Card", hint: "PAN of the individual / entity", required: true }];
  if (p.entityLabel) {
    if (entity === "Private Limited") docs.push({ type: "Certificate of Incorporation", hint: "For private limited companies", required: true });
    if (entity === "Partnership Firm") docs.push({ type: "Partnership Deed", hint: "For partnership firms", required: true });
    if (entity === "LLP") docs.push({ type: "LLP Registration Certificate", hint: "For LLP entities", required: true });
    docs.push({ type: "GST Registration Certificate", hint: "GSTIN copy", required: entity !== "Individual" });
  } else {
    docs.push({ type: "GST Registration Certificate", hint: "GSTIN copy, if registered", required: false });
  }
  if (p.rera) docs.push({ type: RERA_CERTIFICATE, hint: "Upload your RERA registration certificate", required: p.rera === "required" });
  return docs;
}

export const CATEGORIES = ["Individual", "Corporate", "NRI", "Investor"];
export const LEAD_SOURCES = ["Reference", "Walk-in", "Website", "Social Media", "Exhibition", "Newspaper", "Other"];
export const LEAD_STATUSES = ["In Progress", "Converted", "Not Matured"];
export const NEXT_ACTIONS = ["Call back", "Share brochure", "Schedule project visit", "Send price list", "Negotiate & close", "No action required"];
export const DOCUMENT_REQUEST_TYPES = ["Booking Form", "Allotment Letter", "Payment Receipt", "Builder Buyer Agreement", "Demand Letter", "Cost Sheet", "Other"];
export const STATES = ["Punjab", "Haryana", "Chandigarh", "Himachal Pradesh", "Delhi", "Maharashtra", "Other"];
export const CONFIGURATIONS = ["2 BHK", "3 BHK", "3 BHK + Study", "4 BHK", "Plot", "Villa", "Undecided"];
export const EXPERIENCE = ["0–2 years", "2–5 years", "5–10 years", "10+ years"];
export const SPECIALISATION = ["Residential", "Plots & Land", "Luxury Homes", "NRI Clients", "Commercial"];
export const FOLLOWER_RANGES = ["Under 10K", "10K – 50K", "50K – 1 Lakh", "1 – 5 Lakh", "5 Lakh+"];
export const TIME_SLOTS = ["10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"];
