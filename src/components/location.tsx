import Ionicons from "@react-native-vector-icons/ionicons";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { lookupPincode, PincodePlace } from "@/src/api";
import { STATES } from "@/src/brand";
import { Field, Select } from "@/src/components/ui";
import { useCities, useStates } from "@/src/lookups";
import { fonts, makeStyles, spacing, useTheme } from "@/src/theme";

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

/* ------------------------------------------------------------ PIN code (Meraqui-style) */

const norm = (v?: string | null) => String(v ?? "").toLowerCase().replace(/[^a-z]/g, "");
// India Post files some cities under another district (most Mohali PINs are still under
// Rupnagar, which Mohali was carved out of). Names in one group count as the same city.
const CITY_GROUPS = [
  ["mohali", "sasnagar", "sahibzadaajitsinghnagar", "mohalisasnagar", "rupnagar", "ropar"],
  ["shahidbhagatsinghnagar", "sbsnagar", "nawanshahr"],
  ["gurugram", "gurgaon"],
  ["bengaluru", "bangalore", "bengaluruurban", "bangaloreurban"],
  ["mumbai", "mumbaicity", "mumbaisuburban"],
];
const sameName = (a?: string, b?: string) => {
  const x = norm(a);
  const y = norm(b);
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x));
};
const sameCity = (city: string, district: string) => sameName(city, district) || CITY_GROUPS.some((g) => g.includes(norm(city)) && g.includes(norm(district)));

export type PincodeCheck = { loading: boolean; verified: boolean; error?: string; suggestion?: { state: string; city: string } };

// Checks a PIN against India Post and the chosen state / city (as on Meraqui). When state and city
// are both still empty they are filled from the PIN via `onAutofill`. `error` should block saving.
export function usePincodeCheck(pincode: string, state: string, city: string, onAutofill: (v: { state: string; city: string }) => void): PincodeCheck {
  const matchState = useMatchState();
  // Only results for the PIN currently typed count, so "loading" is derived rather than stored.
  const [result, setResult] = useState<{ pin: string; place: PincodePlace | null }>({ pin: "", place: null });
  const autofill = useRef(onAutofill);
  const matchRef = useRef(matchState);
  useEffect(() => {
    autofill.current = onAutofill;
    matchRef.current = matchState;
  });

  useEffect(() => {
    if ((pincode ?? "").length !== 6) return;
    let alive = true;
    lookupPincode(pincode).then((place) => {
      if (!alive) return;
      setResult({ pin: pincode, place });
      if (place?.found) autofill.current({ state: matchRef.current(place.state), city: place.city });
    });
    return () => {
      alive = false;
    };
  }, [pincode]);

  const pin = pincode ?? "";
  if (!pin) return { loading: false, verified: false };
  if (pin.length !== 6) return { loading: false, verified: false, error: "Enter a valid 6-digit PIN code" };
  if (result.pin !== pin) return { loading: true, verified: false };
  const place = result.place;
  if (!place) return { loading: false, verified: false }; // lookup unreachable — don't block
  if (!place.found) return { loading: false, verified: false, error: "This PIN code was not found. Please check it." };
  const stateOk = !state || sameName(state, place.state);
  const cityOk = !city || place.districts.some((d) => sameCity(city, d));
  if (stateOk && cityOk) return { loading: false, verified: true };
  return {
    loading: false,
    verified: false,
    error: `This PIN code belongs to ${place.city}, ${place.state} — not ${city || "the selected city"}${state ? `, ${state}` : ""}.`,
    suggestion: { state: matchState(place.state), city: place.city },
  };
}

// PIN code input with the Meraqui-style status line (verifying / verified / "Use … instead").
export function PinCodeField({ value, onChange, check, onUseSuggestion, label = "PIN code", testID }: { value: string; onChange: (pin: string) => void; check: PincodeCheck; onUseSuggestion: (v: { state: string; city: string }) => void; label?: string; testID?: string }) {
  const styles = usePinStyles();
  const { colors } = useTheme();
  const status = check.loading || check.verified || !!check.suggestion;
  return (
    <View>
      <Field
        label={label}
        placeholder="160001"
        icon="pin-outline"
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        error={check.error}
        containerStyle={status ? { marginBottom: 6 } : undefined}
        testID={testID}
      />
      {check.loading ? (
        <View style={styles.status}>
          <ActivityIndicator size="small" color={colors.brandPrimary} />
          <Text style={[styles.text, { color: colors.muted }]}>Verifying PIN code…</Text>
        </View>
      ) : null}
      {check.verified ? (
        <View style={styles.status}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={[styles.text, { color: colors.success }]}>PIN code verified</Text>
        </View>
      ) : null}
      {check.suggestion ? (
        <Pressable onPress={() => onUseSuggestion(check.suggestion!)} hitSlop={6} style={styles.status} testID={testID ? `${testID}-use-suggestion` : undefined}>
          <Ionicons name="sparkles-outline" size={14} color={colors.brandPrimary} />
          <Text style={[styles.text, { color: colors.brandPrimary, fontFamily: fonts.semibold }]}>
            Use {check.suggestion.city}, {check.suggestion.state} instead
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const usePinStyles = makeStyles(() => ({
  status: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.lg },
  text: { fontFamily: fonts.body, fontSize: 12 },
}));
