import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { errorMessage } from "@/src/api";
import { useAuth } from "@/src/auth";
import { PinCodeField, StateCityFields, usePincodeCheck } from "@/src/components/location";
import { Button, Field, Header, ScreenTitle, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { updateProfile } from "@/src/store/authSlice";
import { useRun } from "@/src/store/useRun";
import { spacing } from "@/src/theme";
import { useToast } from "@/src/toast";

// Edit profile (PUT /api/auth/profile).
export default function ProfileEdit() {
  const s = useScreenStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [first, ...rest] = (user?.name ?? "").split(" ");
  const [f, setF] = useState({ first_name: first ?? "", last_name: rest.join(" "), email: user?.email ?? "", address: user?.address ?? "", pincode: user?.pincode ?? "", city: user?.city ?? "", state: user?.state ?? "" });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [run, saving] = useRun();
  // PIN checked against India Post and the chosen state / city; fills them in while both are empty.
  const pinCheck = usePincodeCheck(f.pincode, f.state, f.city, (v) => setF((x) => (x.state || x.city ? x : { ...x, ...v })));

  const save = async () => {
    const e: Record<string, string> = {};
    if (!f.first_name.trim()) e.first = "First name is required";
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email";
    if (pinCheck.error) return toast.show(pinCheck.error, "error");
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      await run(updateProfile(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()]))));
      toast.show("Profile updated", "success");
      router.back();
    } catch (err) {
      toast.show(errorMessage(err), "error");
    }
  };

  return (
    <View style={s.screen} testID="profile-edit-screen">
      <Header title="Edit Profile" showBell={false} />
      <KeyboardAwareScrollView bottomOffset={110} contentContainerStyle={[s.content, { paddingBottom: 120, paddingTop: 8 }]} keyboardShouldPersistTaps="handled">
        <ScreenTitle title="Edit Profile" />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field label="First name" value={f.first_name} onChangeText={set("first_name")} error={errors.first} containerStyle={{ flex: 1 }} testID="edit-first-name" />
          <Field label="Last name" value={f.last_name} onChangeText={set("last_name")} containerStyle={{ flex: 1 }} testID="edit-last-name" />
        </View>
        <Field label="Email address" value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" error={errors.email} testID="edit-email" />
        <Field label="Mobile number" value={user?.mobile ?? ""} editable={false} rightIcon="lock-closed-outline" testID="edit-mobile" />
        <SectionLabel>Address</SectionLabel>
        <Field label="Address" value={f.address} onChangeText={set("address")} icon="location-outline" testID="edit-address" />
        <StateCityFields state={f.state} city={f.city} onChange={(v) => setF((x) => ({ ...x, ...v }))} testIDPrefix="edit" />
        <PinCodeField value={f.pincode} onChange={set("pincode")} check={pinCheck} onUseSuggestion={(v) => setF((x) => ({ ...x, ...v }))} testID="edit-pincode" />
        <Text style={s.caption}>Partner type and company details are updated by the County Green partner desk.</Text>
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + 16 }}>
          <Button label="Save changes" icon="checkmark" variant="gold" onPress={save} loading={saving} testID="edit-save" />
        </View>
      </KeyboardStickyView>
    </View>
  );
}
