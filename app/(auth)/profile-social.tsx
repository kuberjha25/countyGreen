import Ionicons from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { partnerTypeName } from "@/src/brand";
import { ReferenceChooser } from "@/src/components/partners";
import { Button, Header, ScreenTitle, SectionLabel, StepIndicator, useScreenStyles } from "@/src/components/ui";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { updateDraft } from "@/src/store/authSlice";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import type { Reference } from "@/src/types";

// Screen 6 · Partner registration · Step 3 (associated County Green employee).
// The API takes knows_employee as "yes" / "no" and employee_id from the staff list.
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

  const submit = () => {
    if (knows && !employee) return setErr("Please select the associated employee");
    setErr(undefined);
    dispatch(updateDraft({ knows_employee: knows ? "yes" : "no", employee_id: knows && employee ? String(employee.id) : "", employee_name: knows && employee ? employee.name : "" }));
    router.push("/(auth)/profile-company");
  };

  return (
    <View style={s.screen} testID="profile-social-screen">
      <Header showBell={false} />
      <KeyboardAwareScrollView bottomOffset={110} contentContainerStyle={[s.content, { paddingBottom: 120, paddingTop: 8 }]} keyboardShouldPersistTaps="handled">
        <StepIndicator step={3} total={4} />
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
            <ReferenceChooser value={employee} onChange={setEmployee} userType="backoffice" label="Associated employee" error={err} testID="employee-select" />
          </>
        ) : null}

      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + 16 }}>
          <Button label="Continue" icon="arrow-forward" onPress={submit} testID="profile-step2-continue" />
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
