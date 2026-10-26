import { ComingSoon } from "@/src/components/ui";

// No County Green API for this yet — shown as "Coming soon" until the backend adds it.
export default function Screen() {
  return <ComingSoon title="Availability Requests" body="Availability requests with the assigned staff member and partner details will be available once the County Green server supports it." />;
}
