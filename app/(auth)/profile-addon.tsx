import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { lookupPincode } from "@/src/api";
import { partnerTypeName, STATES } from "@/src/brand";
import { Button, Field, Header, ScreenTitle, SectionLabel, Select, StepIndicator, useScreenStyles } from "@/src/components/ui";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { updateDraft } from "@/src/store/authSlice";
import { spacing } from "@/src/theme";

// Screen 5 · Partner registration · Step 2 (business / social / address — fields depend on the partner type).
export default function ProfileAddon() {
  const s = useScreenStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const draft = useAppSelector((st) => st.auth.draft);
  const isCp = draft.partner_type === "channel_partner";
  const isInfluencer = draft.partner_type === "influencer";
  const [f, setF] = useState({
    company_name: draft.company_name ?? "",
    instagram_link: draft.instagram_link ?? "",
    youtube_link: draft.youtube_link ?? "",
    facebook_link: draft.facebook_link ?? "",
    address: draft.address ?? "",
    pincode: draft.pincode ?? "",
    city: draft.city ?? "",
    state: draft.state ?? "",
  });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onPincode = async (v: string) => {
    const pin = v.replace(/\D/g, "").slice(0, 6);
    set("pincode")(pin);
    const r = await lookupPincode(pin);
    if (r) setF((x) => ({ ...x, city: r.city, state: r.state }));
  };

  const submit = () => {
    const e: Record<string, string> = {};
    if (isCp && !f.company_name.trim()) e.company = "Company / firm name is required";
    const url = /^https?:\/\/\S+$/i;
    if (isInfluencer) for (const k of ["instagram_link", "youtube_link", "facebook_link"] as const) if (f[k] && !url.test(f[k].trim())) e[k] = "Enter the full link, starting with https://";
    if (f.pincode && !/^\d{6}$/.test(f.pincode)) e.pincode = "PIN code must be 6 digits";
    setErrors(e);
    if (Object.keys(e).length) return;
    dispatch(
      updateDraft({
        company_name: isCp ? f.company_name.trim() : "",
        instagram_link: isInfluencer ? f.instagram_link.trim() : "",
        youtube_link: isInfluencer ? f.youtube_link.trim() : "",
        facebook_link: isInfluencer ? f.facebook_link.trim() : "",
        address: f.address.trim(),
        pincode: f.pincode,
        city: f.city.trim(),
        state: f.state,
      }),
    );
    router.push("/(auth)/profile-social");
  };

  return (
    <View style={s.screen} testID="profile-addon-screen">
      <Header showBell={false} />
      <KeyboardAwareScrollView bottomOffset={110} contentContainerStyle={[s.content, { paddingBottom: 120, paddingTop: 8 }]} keyboardShouldPersistTaps="handled">
        <StepIndicator step={2} total={4} />
        <ScreenTitle eyebrow={partnerTypeName(draft.partner_type).toUpperCase()} title="Complete Profile" subtitle="A few more details about you." />

        {isCp ? (
          <>
            <SectionLabel>Business Details</SectionLabel>
            <Field label="Company / Firm name" placeholder="e.g. Gill Realty LLP" value={f.company_name} onChangeText={set("company_name")} rightIcon="business-outline" error={errors.company} testID="company-input" />
          </>
        ) : null}

        {isInfluencer ? (
          <>
            <SectionLabel>Social Media Profiles</SectionLabel>
            <Field label="Instagram" placeholder="https://instagram.com/…" value={f.instagram_link} onChangeText={set("instagram_link")} autoCapitalize="none" icon="logo-instagram" error={errors.instagram_link} testID="instagram-input" />
            <Field label="YouTube" placeholder="https://youtube.com/@…" value={f.youtube_link} onChangeText={set("youtube_link")} autoCapitalize="none" icon="logo-youtube" error={errors.youtube_link} testID="youtube-input" />
            <Field label="Facebook" placeholder="https://facebook.com/…" value={f.facebook_link} onChangeText={set("facebook_link")} autoCapitalize="none" icon="logo-facebook" error={errors.facebook_link} testID="facebook-input" />
          </>
        ) : null}

        <SectionLabel>Address</SectionLabel>
        <Field label="Address" placeholder="Street / Locality" value={f.address} onChangeText={set("address")} icon="location-outline" testID="address-input" />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field label="PIN code" placeholder="160001" value={f.pincode} onChangeText={onPincode} keyboardType="number-pad" maxLength={6} error={errors.pincode} containerStyle={{ flex: 1 }} testID="pincode-input" />
          <Field label="City" placeholder="City" value={f.city} onChangeText={set("city")} containerStyle={{ flex: 1 }} testID="city-input" />
        </View>
        <Select label="State" value={f.state} options={STATES.includes(f.state) || !f.state ? STATES : [f.state, ...STATES]} onChange={set("state")} placeholder="State" testID="state-select" />
        <Text style={s.caption}>City and state fill in automatically from the PIN code.</Text>
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + 16 }}>
          <Button label="Continue" icon="arrow-forward" onPress={submit} testID="profile-addon-continue" />
        </View>
      </KeyboardStickyView>
    </View>
  );
}
