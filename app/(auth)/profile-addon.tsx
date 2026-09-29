import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { put, User } from "@/src/api";
import { useAuth } from "@/src/auth";
import { EXPERIENCE, SPECIALISATION, STATES } from "@/src/brand";
import { Button, Field, Header, ScreenTitle, SectionLabel, Select, StepIndicator, useScreenStyles } from "@/src/components/ui";
import { spacing } from "@/src/theme";
import { useToast } from "@/src/toast";

// Screen 5 · Add On / Additional Information
export default function ProfileAddon() {
  const s = useScreenStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, setUser } = useAuth();
  const [company, setCompany] = useState(user?.company_name ?? "");
  const [rera, setRera] = useState(user?.rera_number ?? "");
  const [exp, setExp] = useState(user?.experience ?? "");
  const [spec, setSpec] = useState(user?.specialisation ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [state, setState] = useState("");

  const save = useMutation({
    mutationFn: () => put<User>("/me", { company_name: company.trim(), rera_number: rera.trim(), experience: exp, specialisation: spec, city: city.trim() || state, profile_step: 2 }),
    onSuccess: (u) => {
      setUser(u);
      router.push("/(auth)/profile-social");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  return (
    <View style={s.screen} testID="profile-addon-screen">
      <Header showBell={false} />
      <KeyboardAwareScrollView bottomOffset={110} contentContainerStyle={[s.content, { paddingBottom: 120, paddingTop: 8 }]} keyboardShouldPersistTaps="handled">
        <StepIndicator step={2} total={4} />
        <ScreenTitle title="Complete Profile" subtitle="Add on — a few professional details to personalise your experience" />

        <SectionLabel>Additional Information</SectionLabel>
        <Field label="Company / Firm name" placeholder="e.g. Gill Channel Partners LLP" value={company} onChangeText={setCompany} rightIcon="business-outline" testID="company-input" />
        <Field label="RERA registration number" placeholder="RERA-PB-XXXX-XXX" value={rera} onChangeText={setRera} autoCapitalize="characters" testID="rera-input" />
        <Select label="Years of experience" value={exp} options={EXPERIENCE} onChange={setExp} placeholder="Select experience" testID="experience-select" />
        <Select label="Specialisation" value={spec} options={SPECIALISATION} onChange={setSpec} placeholder="Select specialisation" testID="specialisation-select" />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field label="City" placeholder="City" value={city} onChangeText={setCity} containerStyle={{ flex: 1 }} testID="city-input" />
          <View style={{ flex: 1 }}>
            <Select label="State" value={state} options={STATES} onChange={setState} placeholder="State" testID="state-select" />
          </View>
        </View>
        <Text style={s.caption}>These details help the County Green sales team route the right projects and clients to you.</Text>
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + 16, gap: 10 }}>
          <Button label="Continue" icon="arrow-forward" onPress={() => save.mutate()} loading={save.isPending} testID="profile-addon-continue" />
          <Button label="Skip for now" variant="ghost" onPress={() => router.push("/(auth)/profile-social")} testID="profile-addon-skip" small />
        </View>
      </KeyboardStickyView>
    </View>
  );
}
