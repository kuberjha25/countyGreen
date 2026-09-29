import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { put, User } from "@/src/api";
import { useAuth } from "@/src/auth";
import { PARTNER_TYPES } from "@/src/brand";
import { Button, Field, Header, ScreenTitle, SectionLabel, Select, StepIndicator, OptionTile, useScreenStyles } from "@/src/components/ui";
import { spacing } from "@/src/theme";
import { useToast } from "@/src/toast";

const ENTITY = ["Individual", "Proprietorship", "Partnership Firm", "LLP", "Private Limited"];

// Screen 4 · Complete Profile · Step 1 (Type of Channel Partner)
export default function ProfileType() {
  const s = useScreenStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, setUser } = useAuth();
  const [type, setType] = useState(user?.partner_type ?? "Channel Partner");
  const [entity, setEntity] = useState("");
  const [first, setFirst] = useState(user?.first_name ?? "");
  const [last, setLast] = useState(user?.last_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = useMutation({
    mutationFn: () => put<User>("/me", { partner_type: type, first_name: first.trim(), last_name: last.trim(), email: email.trim(), profile_step: 1 }),
    onSuccess: (u) => {
      setUser(u);
      router.push("/(auth)/profile-addon");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const submit = () => {
    const e: Record<string, string> = {};
    if (!first.trim()) e.first = "First name is required";
    if (!entity) e.entity = "Select the type of entity";
    if (email && !/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email";
    setErrors(e);
    if (Object.keys(e).length) return;
    save.mutate();
  };

  return (
    <View style={s.screen} testID="profile-type-screen">
      <Header showBell={false} onBack={() => router.replace("/(auth)/login")} />
      <KeyboardAwareScrollView bottomOffset={110} contentContainerStyle={[s.content, { paddingBottom: 120, paddingTop: 8 }]} keyboardShouldPersistTaps="handled">
        <StepIndicator step={1} total={4} />
        <ScreenTitle title="Complete Profile" subtitle="Please fill in your details to get started" />

        <SectionLabel>I am a</SectionLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: spacing.xl }}>
          {PARTNER_TYPES.map((p) => (
            <OptionTile key={p.key} label={p.key} icon={p.icon as any} selected={type === p.key} onPress={() => setType(p.key)} testID={`partner-type-${p.key.toLowerCase().replace(/\s+/g, "-")}`} style={{ width: "48%", flexGrow: 1 }} />
          ))}
        </View>

        <Select label="Type of Channel Partner" value={entity} options={ENTITY} onChange={setEntity} placeholder="Select entity type" error={errors.entity} testID="entity-type-select" />

        <SectionLabel>Basic Information</SectionLabel>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field label="First name" placeholder="First Name" value={first} onChangeText={setFirst} error={errors.first} containerStyle={{ flex: 1 }} testID="first-name-input" />
          <Field label="Last name" placeholder="Last Name" value={last} onChangeText={setLast} containerStyle={{ flex: 1 }} testID="last-name-input" />
        </View>
        <Field label="Email address" placeholder="Email Address" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} rightIcon="mail-outline" error={errors.email} testID="email-input" />
        <Field label="Mobile number" value={user?.phone ?? ""} editable={false} rightIcon="lock-closed-outline" testID="mobile-readonly" />
        <Text style={s.caption}>Your verified mobile number cannot be changed here.</Text>
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + 16 }}>
          <Button label="Continue" icon="arrow-forward" onPress={submit} loading={save.isPending} testID="profile-step1-continue" />
        </View>
      </KeyboardStickyView>
    </View>
  );
}
