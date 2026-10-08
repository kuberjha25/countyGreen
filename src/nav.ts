// Bottom navigation items, shared by the tab bar and the footer nav on
// internal (stacked) screens.
export const TABS = [
  { name: "home", label: "Home", icon: "home-outline", active: "home", sf: "house", href: "/(tabs)/home" },
  { name: "leads", label: "Leads", icon: "people-outline", active: "people", sf: "person.2", href: "/(tabs)/leads" },
  { name: "visits", label: "Visits", icon: "calendar-outline", active: "calendar", sf: "calendar", href: "/(tabs)/visits" },
  { name: "products", label: "Our Products", icon: "map-outline", active: "map", sf: "map", href: "/(tabs)/products" },
  { name: "profile", label: "Profile", icon: "person-circle-outline", active: "person-circle", sf: "person.crop.circle", href: "/(tabs)/profile" },
] as const;

export type TabName = (typeof TABS)[number]["name"];
