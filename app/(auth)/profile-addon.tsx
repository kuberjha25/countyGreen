import Ionicons from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { errorMessage } from "@/src/api";
import { partnerTypeName } from "@/src/brand";
import { ReferenceChooser } from "@/src/components/partners";
import { Button, Field, Header, ScreenTitle, SectionLabel, StepIndicator, useScreenStyles } from "@/src/components/ui";
import { useCpDocuments } from "@/src/lookups";
import { knownDocsFrom, readRegistrationErrors, registrationValues } from "@/src/registration";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { selfRegister, updateDraft } from "@/src/store/authSlice";
import { useRun } from "@/src/store/useRun";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";
import type { Reference } from "@/src/types";

// Screen 5 · Partner registration · Step 2: business details (CP), social links (Influencer),
// and the associated County Green employee (everyone).
// The API takes knows_employee as "yes" / "no" and employee_id from the staff list.
// Channel partners: "Submit" sends the registration here. The API answers a missing document
// with a 422 (`documents.<field_key>` … required) — that isn't shown as an error: the partner
// goes to step 3 with exactly those documents marked Required. Other errors are shown; if no
// document is needed the registration simply completes. Other types continue to step 3 to submit.
export default function ProfileAddon() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const [run, submitting] = useRun();
  const draft = useAppSelector((st) => st.auth.draft);
  const isCp = draft.partner_type === "channel_partner";
  const isInfluencer = draft.partner_type === "influencer";
  useCpDocuments(isCp ? draft.business_type : undefined); // load names (and step 3's list) early
  const cpDocuments = useAppSelector((st) => st.lookups.cpDocuments);
  const [f, setF] = useState({
    company_name: draft.company_name ?? "",
    instagram_link: draft.instagram_link ?? "",
    youtube_link: draft.youtube_link ?? "",
    facebook_link: draft.facebook_link ?? "",
  });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const [knows, setKnows] = useState<boolean>(draft.knows_employee === "yes");
  const [employee, setEmployee] = useState<Reference | null>(draft.employee_id ? { id: Number(draft.employee_id), name: draft.employee_name ?? "", mobile: "" } : null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async () => {
    const e: Record<string, string> = {};
    if (isCp && !f.company_name.trim()) e.company = "Company / firm name is required";
    const url = /^https?:\/\/\S+$/i;
    if (isInfluencer) for (const k of ["instagram_link", "youtube_link", "facebook_link"] as const) if (f[k] && !url.test(f[k].trim())) e[k] = "Enter the full link, starting with https://";
    if (knows && !employee) e.employee = "Please select the associated employee";
    setErrors(e);
    if (Object.keys(e).length) return;
    const answers = {
      company_name: isCp ? f.company_name.trim() : "",
      instagram_link: isInfluencer ? f.instagram_link.trim() : "",
      youtube_link: isInfluencer ? f.youtube_link.trim() : "",
      facebook_link: isInfluencer ? f.facebook_link.trim() : "",
      knows_employee: knows ? "yes" : "no",
      employee_id: knows && employee ? String(employee.id) : "",
      employee_name: knows && employee ? employee.name : "",
    };
    dispatch(updateDraft(answers));
    if (!isCp) return router.push("/(auth)/profile-company");
    try {
      await run(selfRegister(registrationValues({ ...draft, ...answers })));
      router.replace("/(auth)/welcome");
    } catch (err) {
      const { docs, others } = readRegistrationErrors(err, knownDocsFrom(cpDocuments));
      if (others.length) return toast.show(others[0].message, "error");
      if (Object.keys(docs).length) return router.push({ pathname: "/(auth)/profile-company", params: { required: JSON.stringify(docs) } });
      toast.show(errorMessage(err), "error");
    }
  };

  return (
    <View style={s.screen} testID="profile-addon-screen">
      <Header showBell={false} />
      <KeyboardAwareScrollView bottomOffset={110} contentContainerStyle={[s.content, { paddingBottom: 120, paddingTop: 8 }]} keyboardShouldPersistTaps="handled">
        <StepIndicator step={2} total={3} />
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

        <SectionLabel>Do you know any County Green employee?</SectionLabel>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: spacing.xl }}>
          {[
            { v: true, label: "Yes", icon: "checkmark" as const },
            { v: false, label: "No", icon: "close" as const },
          ].map((o) => {
            const sel = knows === o.v;
            return (
              <Pressable key={o.label} testID={`knows-employee-${o.label.toLowerCase()}`} onPress={() => setKnows(o.v)} style={[styles.yesNo, sel && styles.yesNoSel]}>
                <View style={[styles.yesNoIcon, sel && { backgroundColor: colors.brandSecondary }]}>
                  <Ionicons name={o.icon} size={16} color={sel ? colors.onBrandSecondary : colors.muted} />
                </View>
                <Text style={[styles.yesNoText, sel && { color: colors.brandPrimary }]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {knows ? <ReferenceChooser value={employee} onChange={setEmployee} userType="backoffice" publicLookup label="Associated employee" error={errors.employee} testID="employee-select" /> : null}
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + 16 }}>
          <Button label={isCp ? "Submit" : "Continue"} icon={isCp ? "checkmark" : "arrow-forward"} onPress={submit} loading={submitting} testID="profile-addon-continue" />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  yesNo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, minHeight: 60 },
  yesNoSel: { borderColor: colors.brandSecondary, backgroundColor: colors.goldSoft },
  yesNoIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  yesNoText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onSurface },
}));
