import { useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { partnerTypeName } from "@/src/brand";
import { Button, Field, Header, ScreenTitle, SectionLabel, StepIndicator, useScreenStyles } from "@/src/components/ui";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { updateDraft } from "@/src/store/authSlice";
import { spacing } from "@/src/theme";

// Screen 5 · Partner registration · Step 2 (business details for CP, social links for Influencer).
// Broker / Freelancer skip this step (see hasDetailsStep).
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
  });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const e: Record<string, string> = {};
    if (isCp && !f.company_name.trim()) e.company = "Company / firm name is required";
    const url = /^https?:\/\/\S+$/i;
    if (isInfluencer) for (const k of ["instagram_link", "youtube_link", "facebook_link"] as const) if (f[k] && !url.test(f[k].trim())) e[k] = "Enter the full link, starting with https://";
    setErrors(e);
    if (Object.keys(e).length) return;
    dispatch(
      updateDraft({
        company_name: isCp ? f.company_name.trim() : "",
        instagram_link: isInfluencer ? f.instagram_link.trim() : "",
        youtube_link: isInfluencer ? f.youtube_link.trim() : "",
        facebook_link: isInfluencer ? f.facebook_link.trim() : "",
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
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + 16 }}>
          <Button label="Continue" icon="arrow-forward" onPress={submit} testID="profile-addon-continue" />
        </View>
      </KeyboardStickyView>
    </View>
  );
}
