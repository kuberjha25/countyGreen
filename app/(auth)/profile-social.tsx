import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get, put, User } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Button, Field, Header, ScreenTitle, SectionLabel, Select, StepIndicator, useScreenStyles } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

// Screen 6 · Complete Profile · Step 2 (Employee & Social)
export default function ProfileSocial() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, setUser } = useAuth();
  const [knows, setKnows] = useState<boolean>(user?.knows_employee ?? false);
  const [employee, setEmployee] = useState(user?.associated_employee ?? "");
  const [fb, setFb] = useState(user?.social?.facebook ?? "");
  const [ig, setIg] = useState(user?.social?.instagram ?? "");
  const [yt, setYt] = useState(user?.social?.youtube ?? "");
  const [err, setErr] = useState<string | undefined>();

  const employees = useQuery({ queryKey: ["employees"], queryFn: () => get<{ name: string }[]>("/employees") });

  const save = useMutation({
    mutationFn: () => put<User>("/me", { knows_employee: knows, associated_employee: knows ? employee : "", social: { facebook: fb.trim(), instagram: ig.trim(), youtube: yt.trim() }, profile_step: 3 }),
    onSuccess: (u) => {
      setUser(u);
      router.push("/(auth)/profile-company");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const submit = () => {
    if (knows && !employee) return setErr("Please select the associated employee");
    setErr(undefined);
    save.mutate();
  };

  return (
    <View style={s.screen} testID="profile-social-screen">
      <Header showBell={false} />
      <KeyboardAwareScrollView bottomOffset={110} contentContainerStyle={[s.content, { paddingBottom: 120, paddingTop: 8 }]} keyboardShouldPersistTaps="handled">
        <StepIndicator step={3} total={4} />
        <ScreenTitle title="Complete Profile" subtitle="Please fill in your details to get started" />

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
            <SectionLabel>Select Employee</SectionLabel>
            <Select label="Associated employee" value={employee} options={(employees.data ?? []).map((e) => e.name)} onChange={setEmployee} placeholder={employees.isLoading ? "Loading…" : "Select employee"} error={err} testID="employee-select" />
          </>
        ) : null}

        <SectionLabel>Social Media Profiles</SectionLabel>
        <Field label="Facebook" placeholder="Facebook Profile Link" value={fb} onChangeText={setFb} autoCapitalize="none" icon="logo-facebook" testID="facebook-input" />
        <Field label="Instagram" placeholder="Instagram Profile Link" value={ig} onChangeText={setIg} autoCapitalize="none" icon="logo-instagram" testID="instagram-input" />
        <Field label="YouTube" placeholder="YouTube Channel Link" value={yt} onChangeText={setYt} autoCapitalize="none" icon="logo-youtube" testID="youtube-input" />
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + 16 }}>
          <Button label="Continue" icon="arrow-forward" onPress={submit} loading={save.isPending} testID="profile-step2-continue" />
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
