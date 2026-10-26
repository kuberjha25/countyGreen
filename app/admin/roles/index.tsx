import { ComingSoon } from "@/src/components/ui";

// No County Green API for this yet — shown as "Coming soon" until the backend adds it.
export default function Screen() {
  return <ComingSoon title="Role Management" body="Defining what each role can view, add, edit, delete, modify, assign and reassign will be available once the County Green server supports it." />;
}
