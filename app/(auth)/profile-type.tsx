import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { hasDetailsStep, PARTNER_TYPES, PartnerType } from "@/src/brand";
import { PinCodeField, StateCityFields, usePincodeCheck } from "@/src/components/location";
import { BusinessTypePicker } from "@/src/components/partners";
import { Button, Field, Header, OptionTile, ScreenTitle, SectionLabel, StepIndicator, useScreenStyles } from "@/src/components/ui";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { updateDraft } from "@/src/store/authSlice";
import { spacing } from "@/src/theme";

// Screen 4 · Partner registration · Step 1 (partner type & basic information).
// Answers are kept in the Redux draft and submitted together at step 4.
export default function ProfileType() {
  const s = useScreenStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const draft = useAppSelector((st) => st.auth.draft);
  const [type, setType] = useState<PartnerType>((PARTNER_TYPES.find((p) => p.api === draft.partner_type)?.key as PartnerType) ?? "Channel Partner");
  const [business, setBusiness] = useState(draft.business_type ?? "");
  const [first, setFirst] = useState(draft.first_name ?? "");
  const [last, setLast] = useState(draft.last_name ?? "");
  const [email, setEmail] = useState(draft.email ?? "");
  const [addr, setAddr] = useState({ address: draft.address ?? "", pincode: draft.pincode ?? "", city: draft.city ?? "", state: draft.state ?? "" });
  // PIN checked against India Post and the chosen state / city; fills them in while both are empty.
  const pinCheck = usePincodeCheck(addr.pincode, addr.state, addr.city, (v) => setAddr((x) => (x.state || x.city ? x : { ...x, ...v })));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isCp = type === "Channel Partner";

  const submit = () => {
    const e: Record<string, string> = {};
    if (!first.trim()) e.first = "First name is required";
    if (!last.trim()) e.last = "Last name is required";
    if (isCp && !business) e.business = "Select the type of business";
    if (email && !/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email";
    if (pinCheck.error) e.pincode = pinCheck.error;
    setErrors(e);
    if (Object.keys(e).length) return;
    const partner_type = PARTNER_TYPES.find((p) => p.key === type)!.api;
    dispatch(updateDraft({ partner_type, business_type: isCp ? business : "", first_name: first.trim(), last_name: last.trim(), email: email.trim(), address: addr.address.trim(), pincode: addr.pincode, city: addr.city.trim(), state: addr.state }));
    if (hasDetailsStep(partner_type)) return router.push("/(auth)/profile-addon");
    // Broker / Freelancer have no step-2 fields — clear any left over from another type and skip it.
    dispatch(updateDraft({ company_name: "", instagram_link: "", youtube_link: "", facebook_link: "" }));
    router.push("/(auth)/profile-social");
  };

  return (
    <View style={s.screen} testID="profile-type-screen">
      <Header showBell={false} onBack={() => router.replace("/(auth)/login")} />
      <KeyboardAwareScrollView bottomOffset={110} contentContainerStyle={[s.content, { paddingBottom: 120, paddingTop: 8 }]} keyboardShouldPersistTaps="handled">
        <StepIndicator step={1} total={hasDetailsStep(PARTNER_TYPES.find((p) => p.key === type)!.api) ? 4 : 3} />
        <ScreenTitle title="Complete Profile" subtitle="Please fill in your details to get started" />

        <SectionLabel>I am a</SectionLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: spacing.xl }}>
          {PARTNER_TYPES.map((p) => (
            <OptionTile key={p.key} label={p.key} icon={p.icon as any} selected={type === p.key} onPress={() => setType(p.key)} testID={`partner-type-${p.key.toLowerCase().replace(/\s+/g, "-")}`} style={{ width: "48%", flexGrow: 1 }} />
          ))}
        </View>

        {isCp ? <BusinessTypePicker value={business} onChange={setBusiness} error={errors.business} testID="business-type" /> : null}

        <SectionLabel>Basic Information</SectionLabel>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field label="First name" placeholder="First Name" value={first} onChangeText={setFirst} error={errors.first} containerStyle={{ flex: 1 }} testID="first-name-input" />
          <Field label="Last name" placeholder="Last Name" value={last} onChangeText={setLast} error={errors.last} containerStyle={{ flex: 1 }} testID="last-name-input" />
        </View>
        <Field label="Email address" placeholder="Email Address" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} rightIcon="mail-outline" error={errors.email} testID="email-input" />
        <Field label="Mobile number" value={draft.mobile ?? ""} editable={false} rightIcon="lock-closed-outline" testID="mobile-readonly" />
        <Text style={s.caption}>Your verified mobile number cannot be changed here.</Text>

        <SectionLabel>Address</SectionLabel>
        <Field label="Street / Locality" placeholder="House no., street, locality" value={addr.address} onChangeText={(v) => setAddr((x) => ({ ...x, address: v }))} icon="location-outline" testID="address-input" />
        <StateCityFields state={addr.state} city={addr.city} onChange={(v) => setAddr((x) => ({ ...x, ...v }))} testIDPrefix="profile" />
        <PinCodeField value={addr.pincode} onChange={(v) => setAddr((x) => ({ ...x, pincode: v }))} check={pinCheck} onUseSuggestion={(v) => setAddr((x) => ({ ...x, ...v }))} testID="pincode-input" />
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + 16 }}>
          <Button label="Continue" icon="arrow-forward" onPress={submit} testID="profile-step1-continue" />
        </View>
      </KeyboardStickyView>
    </View>
  );
}
