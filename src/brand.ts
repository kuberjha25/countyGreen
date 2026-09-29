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

export const PARTNER_TYPES = [
  { key: "Channel Partner", icon: "people-outline" },
  { key: "Broker", icon: "briefcase-outline" },
  { key: "Influencer", icon: "sparkles-outline" },
  { key: "Freelancer", icon: "person-outline" },
];

export const CATEGORIES = ["Individual", "Corporate", "NRI", "Investor"];
export const LEAD_SOURCES = ["Reference", "Walk-in", "Website", "Social Media", "Exhibition", "Newspaper", "Other"];
export const STATES = ["Punjab", "Haryana", "Chandigarh", "Himachal Pradesh", "Delhi", "Maharashtra", "Other"];
export const CONFIGURATIONS = ["2 BHK", "3 BHK", "3 BHK + Study", "4 BHK", "Plot", "Villa", "Undecided"];
export const EXPERIENCE = ["0–2 years", "2–5 years", "5–10 years", "10+ years"];
export const SPECIALISATION = ["Residential", "Plots & Land", "Luxury Homes", "NRI Clients", "Commercial"];
export const TIME_SLOTS = ["10:00 AM", "11:00 AM", "12:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM"];
