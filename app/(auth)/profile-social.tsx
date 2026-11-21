import Ionicons from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { errorMessage } from "@/src/api";
import { hasDetailsStep, partnerTypeName } from "@/src/brand";
import { ReferenceChooser } from "@/src/components/partners";
import { useCpDocuments } from "@/src/lookups";
import { knownDocsFrom, readRegistrationErrors, registrationValues } from "@/src/registration";
import { Button, Header, ScreenTitle, SectionLabel, StepIndicator, useScreenStyles } from "@/src/components/ui";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { selfRegister, updateDraft } from "@/src/store/authSlice";
import { useRun } from "@/src/store/useRun";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";
import type { Reference } from "@/src/types";

// Screen 6 · Partner registration · Step 3 (associated County Green employee).
// The API takes knows_employee as "yes" / "no" and employee_id from the staff list.
// Channel partners: "Submit" sends the registration here. The API answers a missing document
// with a 422 (`documents.<field_key>` … required) — that isn't shown as an error: the partner
// goes to step 4 with exactly those documents marked Required. Other errors are shown; if no
// document is needed the registration simply completes.
export default function ProfileSocial() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const draft = useAppSelector((st) => st.auth.draft);
  const [knows, setKnows] = useState<boolean>(draft.knows_employee === "yes");
  const [employee, setEmployee] = useState<Reference | null>(draft.employee_id ? { id: Number(draft.employee_id), name: draft.employee_name ?? "", mobile: "" } : null);
  const [err, setErr] = useState<string | undefined>();
  const toast = useToast();
  const [run, submitting] = useRun();
  const isCp = draft.partner_type === "channel_partner";
  useCpDocuments(isCp ? draft.business_type : undefined); // load names (and step 4's list) early
  const cpDocuments = useAppSelector((st) => st.lookups.cpDocuments);

  const submit = async () => {
    if (knows && !employee) return setErr("Please select the associated employee");
    setErr(undefined);
    const answers = { knows_employee: knows ? "yes" : "no", employee_id: knows && employee ? String(employee.id) : "", employee_name: knows && employee ? employee.name : "" };
    dispatch(updateDraft(answers));
    if (!isCp) return router.push("/(auth)/profile-company");
    try {
      await run(selfRegister(registrationValues({ ...draft, ...answers })));
      router.replace("/(auth)/welcome");
    } catch (e) {
      const { docs, others } = readRegistrationErrors(e, knownDocsFrom(cpDocuments));
      if (others.length) return toast.show(others[0].message, "error");
      if (Object.keys(docs).length) return router.push({ pathname: "/(auth)/profile-company", params: { required: JSON.stringify(docs) } });
      toast.show(errorMessage(e), "error");
    }
  };

  return (
    <View style={s.screen} testID="profile-social-screen">
      <Header showBell={false} />
      <KeyboardAwareScrollView bottomOffset={110} contentContainerStyle={[s.content, { paddingBottom: 120, paddingTop: 8 }]} keyboardShouldPersistTaps="handled">
        <StepIndicator step={hasDetailsStep(draft.partner_type) ? 3 : 2} total={hasDetailsStep(draft.partner_type) ? 4 : 3} />
        <ScreenTitle eyebrow={partnerTypeName(draft.partner_type).toUpperCase()} title="Complete Profile" subtitle="Tell us if you already work with someone from the County Green team." />

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

        {knows ? (
          <>
            <ReferenceChooser value={employee} onChange={setEmployee} userType="backoffice" publicLookup label="Associated employee" error={err} testID="employee-select" />
          </>
        ) : null}

      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + 16 }}>
          <Button label={isCp ? "Submit" : "Continue"} icon={isCp ? "checkmark" : "arrow-forward"} onPress={submit} loading={submitting} testID="profile-step2-continue" />
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
