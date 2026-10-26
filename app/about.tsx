import { ComingSoon } from "@/src/components/ui";

// No content (CMS) API on the County Green server yet — shown as "Coming soon".
export default function Screen() {
  return <ComingSoon title="About Us" body="About County Green will be available once the County Green server provides the content." />;
}
