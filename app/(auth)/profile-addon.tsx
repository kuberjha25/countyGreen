import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { put, User } from "@/src/api";
import { useAuth } from "@/src/auth";
import { EXPERIENCE, FOLLOWER_RANGES, SPECIALISATION, STATES, partnerProfile } from "@/src/brand";
import { Button, ChoiceChips, Field, Header, ScreenTitle, SectionLabel, Select, StepIndicator, useScreenStyles } from "@/src/components/ui";
import { spacing } from "@/src/theme";
import { useToast } from "@/src/toast";

// Screen 5 · Complete Profile · Step 2 (Professional details — fields depend on the partner type)
export default function ProfileAddon() {
  const s = useScreenStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, setUser } = useAuth();
  const type = user?.partner_type ?? "Channel Partner";
  const profile = partnerProfile(type);
  const firmRequired = !!profile.entityLabel && !!user?.entity_type && user.entity_type !== "Individual";
  const [company, setCompany] = useState(user?.company_name ?? "");
  const [exp, setExp] = useState(user?.experience ?? "");
  const [spec, setSpec] = useState(user?.specialisation ?? "");
  const [fb, setFb] = useState(user?.social?.facebook ?? "");
  const [ig, setIg] = useState(user?.social?.instagram ?? "");
  const [yt, setYt] = useState(user?.social?.youtube ?? "");
  const [followers, setFollowers] = useState(user?.followers ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [state, setState] = useState(user?.state ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: () =>
      put<User>("/me", {
        company_name: profile.entityLabel ? company.trim() : "",
        experience: profile.experience ? exp : "",
        specialisation: profile.specialisation ? spec : "",
        social: profile.social ? { facebook: fb.trim(), instagram: ig.trim(), youtube: yt.trim() } : {},
        followers: profile.social ? followers : "",
        city: city.trim(),
        state,
        profile_step: Math.max(user?.profile_step ?? 0, 2),
      }),
    onSuccess: (u) => {
      setUser(u);
      router.push("/(auth)/profile-social");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const submit = () => {
    const e: Record<string, string> = {};
    if (firmRequired && !company.trim()) e.company = "Company / firm name is required";
    if (profile.social && !fb.trim() && !ig.trim() && !yt.trim()) e.social = "Add at least one social media profile";
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate();
  };

  const canSkip = !firmRequired && !profile.social;

  return (
    <View style={s.screen} testID="profile-addon-screen">
      <Header showBell={false} />
      <KeyboardAwareScrollView bottomOffset={110} contentContainerStyle={[s.content, { paddingBottom: 120, paddingTop: 8 }]} keyboardShouldPersistTaps="handled">
        <StepIndicator step={2} total={4} />
        <ScreenTitle eyebrow={type.toUpperCase()} title="Complete Profile" subtitle={profile.detailsSubtitle} />

        {profile.entityLabel ? (
          <>
            <SectionLabel>Business Details</SectionLabel>
            <Field label={firmRequired ? "Company / Firm name" : "Company / Firm name (optional)"} placeholder="e.g. Gill Realty LLP" value={company} onChangeText={setCompany} rightIcon="business-outline" error={errors.company} testID="company-input" />
          </>
        ) : null}

        {profile.social ? (
          <>
            <SectionLabel>Social Media Profiles</SectionLabel>
            <Field label="Instagram" placeholder="Instagram Profile Link" value={ig} onChangeText={setIg} autoCapitalize="none" icon="logo-instagram" testID="instagram-input" />
            <Field label="YouTube" placeholder="YouTube Channel Link" value={yt} onChangeText={setYt} autoCapitalize="none" icon="logo-youtube" testID="youtube-input" />
            <Field label="Facebook" placeholder="Facebook Profile Link" value={fb} onChangeText={setFb} autoCapitalize="none" icon="logo-facebook" error={errors.social} testID="facebook-input" />
            <ChoiceChips label="Total followers" options={FOLLOWER_RANGES} value={followers} onChange={setFollowers} testID="followers" />
          </>
        ) : null}

        {profile.experience || profile.specialisation ? <SectionLabel>Experience</SectionLabel> : null}
        {profile.experience ? <ChoiceChips label="Years of experience" value={exp} options={EXPERIENCE} onChange={setExp} testID="experience" /> : null}
        {profile.specialisation ? <ChoiceChips label="Specialisation" value={spec} options={SPECIALISATION} onChange={setSpec} testID="specialisation" /> : null}

        <SectionLabel>Location</SectionLabel>
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
          <Button label="Continue" icon="arrow-forward" onPress={submit} loading={save.isPending} testID="profile-addon-continue" />
          {canSkip ? <Button label="Skip for now" variant="ghost" onPress={() => router.push("/(auth)/profile-social")} testID="profile-addon-skip" small /> : null}
        </View>
      </KeyboardStickyView>
    </View>
  );
}
