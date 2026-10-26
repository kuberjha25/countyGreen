import { ComingSoon } from "@/src/components/ui";

// No content (CMS) API on the County Green server yet — shown as "Coming soon".
export default function Screen() {
  return <ComingSoon title="Terms & Conditions" body="The Terms & Conditions will be available once the County Green server provides the content." />;
}
