import { View } from "react-native";

import { STATES } from "@/src/brand";
import { Field, Select } from "@/src/components/ui";
import { useCities, useStates } from "@/src/lookups";

const same = (a?: string | null, b?: string | null) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
const withCurrent = (options: string[], current: string) => (!current || options.some((o) => same(o, current)) ? options : [current, ...options]);

// State + City pickers from GET /api/states and GET /api/cities?state_id= (forms submit the NAMES).
// Falls back to the built-in state list / a free-text city when the server list is unavailable or empty.
export function StateCityFields({ state, city, onChange, testIDPrefix }: { state: string; city: string; onChange: (v: { state: string; city: string }) => void; testIDPrefix: string }) {
  const states = useStates();
  const stateNames = states.data?.length ? states.data.map((st) => st.name) : STATES;
  const stateId = states.data?.find((st) => same(st.name, state))?.id;
  const cities = useCities(stateId);
  const cityNames = (cities.data ?? []).map((c) => c.name);

  return (
    <View style={{ flexDirection: "row", gap: 10 }}>
      <View style={{ flex: 1 }}>
        <Select label="State" value={state} options={withCurrent(stateNames, state)} onChange={(v) => onChange({ state: v, city: same(v, state) ? city : "" })} placeholder={states.status === "loading" ? "Loading…" : "Select state"} testID={`${testIDPrefix}-state`} />
      </View>
      <View style={{ flex: 1 }}>
        {cityNames.length ? (
          <Select label="City" value={city} options={withCurrent(cityNames, city)} onChange={(v) => onChange({ state, city: v })} placeholder="Select city" testID={`${testIDPrefix}-city`} />
        ) : (
          <Field label="City" placeholder={cities.status === "loading" ? "Loading…" : "City"} value={city} onChangeText={(v) => onChange({ state, city: v })} testID={`${testIDPrefix}-city`} />
        )}
      </View>
    </View>
  );
}

// PIN code lookup gives India Post names — use the server's spelling when it matches.
export function useMatchState() {
  const states = useStates();
  return (name: string) => states.data?.find((st) => same(st.name, name))?.name ?? name;
}
