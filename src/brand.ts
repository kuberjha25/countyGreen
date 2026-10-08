// County Green brand assets & static copy (sourced from supplied creatives).
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
  name: "County Green",
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
// the "I am a" selection. Which documents are asked for is set by Admin (see
// RegDocConfig below), not hard-coded per type.
type PartnerProfile = {
  entityLabel?: string; // entity type + company/firm name (business partners only)
  experience: boolean;
  specialisation: boolean;
  social: boolean; // social media profiles — influencers only
  detailsSubtitle: string;
};

export const PARTNER_PROFILE: Record<PartnerType, PartnerProfile> = {
  "Channel Partner": { entityLabel: "Type of channel partner entity", experience: true, specialisation: true, social: false, detailsSubtitle: "A few professional details about your channel partner business." },
  Broker: { entityLabel: "Type of broker entity", experience: true, specialisation: true, social: false, detailsSubtitle: "A few professional details about your brokerage." },
  Influencer: { experience: false, specialisation: false, social: true, detailsSubtitle: "Share your social media profiles and audience size." },
  Freelancer: { experience: true, specialisation: true, social: false, detailsSubtitle: "A few professional details about your work as a freelancer." },
};

export const partnerProfile = (type?: string) => PARTNER_PROFILE[type as PartnerType] ?? PARTNER_PROFILE["Channel Partner"];
export const partnerShort = (type?: string) => PARTNER_TYPES.find((p) => p.key === type)?.short ?? type ?? "—";

export const RERA_CERTIFICATE = "RERA Certificate";

export type DocSpec = { type: string; hint: string; required: boolean };

// Registration documents are configured by Admin (Admin → CP Registration
// Documents): per partner type each document is hidden, optional or mandatory.
// Entity-specific documents are asked for only when the entity type matches.
// RERA is always an uploaded certificate, never a typed number.
export type DocRule = "hidden" | "optional" | "mandatory";
export type RegDocConfig = { id: string; type: string; hint: string; rules: Record<PartnerType, DocRule>; entity_types?: string[] };

const docRules = (cp: DocRule, broker: DocRule, influencer: DocRule, freelancer: DocRule): Record<PartnerType, DocRule> => ({ "Channel Partner": cp, Broker: broker, Influencer: influencer, Freelancer: freelancer });

export const DEFAULT_REG_DOCS: RegDocConfig[] = [
  { id: "pan", type: "PAN Card", hint: "PAN of the individual / entity", rules: docRules("mandatory", "mandatory", "mandatory", "mandatory") },
  { id: "coi", type: "Certificate of Incorporation", hint: "For private limited companies", rules: docRules("mandatory", "mandatory", "hidden", "hidden"), entity_types: ["Private Limited"] },
  { id: "deed", type: "Partnership Deed", hint: "For partnership firms", rules: docRules("mandatory", "mandatory", "hidden", "hidden"), entity_types: ["Partnership Firm"] },
  { id: "llp", type: "LLP Registration Certificate", hint: "For LLP entities", rules: docRules("mandatory", "mandatory", "hidden", "hidden"), entity_types: ["LLP"] },
  { id: "gst", type: "GST Registration Certificate", hint: "GSTIN copy, if registered", rules: docRules("optional", "optional", "optional", "optional") },
  { id: "rera", type: RERA_CERTIFICATE, hint: "Upload your RERA registration certificate", rules: docRules("mandatory", "mandatory", "hidden", "optional") },
];

// Documents to ask a partner type (+ entity, when known) for, in admin order.
export function regDocsFor(config: RegDocConfig[], type?: string, entity?: string): DocSpec[] {
  const t = (PARTNER_PROFILE[type as PartnerType] ? type : "Channel Partner") as PartnerType;
  return config
    .filter((d) => (d.rules[t] ?? "hidden") !== "hidden" && (!d.entity_types?.length || (!!entity && d.entity_types.includes(entity))))
    .map((d) => ({ type: d.type, hint: d.hint, required: d.rules[t] === "mandatory" }));
}

// "Our Products" (replaces the old unit inventory). Admin can add / edit / delete these.
export type Product = { id: string; name: string; category: string; description: string; image: string; active: boolean; order: number };
export const DEFAULT_PRODUCTS: Product[] = [
  { id: "prod-500", name: "500 Sq. Yards", category: "Residential Plot", description: "Residential plot of 500 sq. yards in the County Green township, New Chandigarh.", image: "golden", active: true, order: 1 },
  { id: "prod-1000", name: "1000 Sq. Yards", category: "Residential Plot", description: "Premium residential plot of 1000 sq. yards with open green surroundings.", image: "panoramic", active: true, order: 2 },
  { id: "prod-if-350", name: "Independent Floor – 350 Sq. Yards", category: "Independent Floor", description: "Independent floor on a 350 sq. yards plot, ready for everyday living.", image: "living", active: true, order: 3 },
];
export const AVAILABILITY_STATUSES = ["Pending", "Available", "Not Available", "Closed"];

// WhatsApp greeting templates; {name} becomes the recipient's first name.
export const OCCASIONS = ["Birthday", "Anniversary"] as const;
export type Occasion = (typeof OCCASIONS)[number];
export const GREETING_TEMPLATES: Record<Occasion, string[]> = {
  Birthday: [
    "Dear {name}, wishing you a very Happy Birthday! May the year ahead bring you joy, good health and great success. — Team County Green",
    "Happy Birthday, {name}! Thank you for being a valued partner of County Green. Have a wonderful day! — Team County Green",
    "Warm birthday wishes to you, {name}. May all your dreams find a home this year. — County Green, New Chandigarh",
  ],
  Anniversary: [
    "Dear {name}, Happy Anniversary! Wishing you both a lifetime of love and happiness. — Team County Green",
    "Happy Anniversary, {name}! May your home always be filled with joy and togetherness. — Team County Green",
    "Warm anniversary wishes to you and your family, {name}. — County Green, New Chandigarh",
  ],
};

// Option lists managed by Admin (Admin → Masters) and served by GET /lookups.
export const MASTERS = [
  { key: "customer_categories", label: "Customer Category", icon: "people-outline" },
  { key: "configurations", label: "Preferred Configuration", icon: "grid-outline" },
  { key: "lead_sources", label: "Lead Source", icon: "git-branch-outline" },
  { key: "time_slots", label: "Time Slot", icon: "time-outline" },
] as const;
export type MasterKey = (typeof MASTERS)[number]["key"];

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
