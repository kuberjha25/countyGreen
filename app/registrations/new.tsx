import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { post } from "@/src/api";
import { PARTNER_TYPES, RERA_CERTIFICATE, STATES, partnerProfile } from "@/src/brand";
import { Badge, Button, Field, Header, OptionTile, ScreenTitle, SectionLabel, Select, useScreenStyles } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

const EMPTY = { category: "", first_name: "", last_name: "", mobile: "", email: "", address: "", city: "", state: "", pincode: "", company: "", rera_file: "", project: "County Greens", notes: "", facebook: "", instagram: "", youtube: "" };
const DEMO = { ...EMPTY, category: "Influencer", first_name: "Rohit", last_name: "Mehra", mobile: "91234 56789", email: "rohit.mehra@example.com", address: "Plot 21, Phase 7", city: "Mohali", state: "Punjab", pincode: "160055", instagram: "https://instagram.com/rohit.mehra", youtube: "https://youtube.com/@rohitmehra" };

// Screen 11 · New Registration (single screen) + success state
export default function NewRegistration() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { demo, step } = useLocalSearchParams<{ demo?: string; step?: string }>();
  const [f, setF] = useState(demo === "1" ? DEMO : EMPTY);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const profile = partnerProfile(f.category || undefined);
  const [created, setCreated] = useState<any>(step === "success" ? { registration_no: "CG-REG-2026-0105", first_name: "Rohit", last_name: "Mehra", status: "Pending" } : null);

  const create = useMutation({
    mutationFn: () => {
      const { rera_file, facebook, instagram, youtube, ...rest } = f;
      return post("/registrations", {
        ...rest,
        company: profile.entityLabel ? f.company : "",
        social: profile.social ? { facebook, instagram, youtube } : {},
        documents: profile.rera && rera_file ? [{ type: RERA_CERTIFICATE, status: "Under Review", file_name: rera_file }] : [],
      });
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["registrations"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setCreated(r);
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const submit = () => {
    const e: Record<string, string> = {};
    if (!f.category) e.category = "Select a category";
    if (!f.first_name.trim()) e.first_name = "First name is required";
    if (f.mobile.replace(/\D/g, "").length < 10) e.mobile = "Enter a valid 10-digit mobile number";
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email";
    if (!f.city.trim()) e.city = "City is required";
    if (f.pincode && !/^\d{6}$/.test(f.pincode)) e.pincode = "Pincode must be 6 digits";
    if (f.category && profile.rera === "required" && !f.rera_file) e.rera = "Upload the RERA certificate";
    if (f.category && profile.social && !f.facebook.trim() && !f.instagram.trim() && !f.youtube.trim()) e.social = "Add at least one social media profile";
    setErrors(e);
    if (Object.keys(e).length) return toast.show(e.category ?? e.rera ?? "Please correct the highlighted fields", "error");
    create.mutate();
  };

  if (created) {
    return (
      <View style={s.screen} testID="new-registration-success">
        <Header showBack={false} showBell={false} />
        <Animated.View entering={FadeInDown.duration(500)} style={styles.successWrap}>
          <View style={styles.successIcon}><Ionicons name="checkmark" size={40} color={colors.forestDeep} /></View>
          <Text style={styles.successTitle}>Registration Submitted</Text>
          <Text style={styles.successBody}>The registration is now pending verification by the County Greens partner desk.</Text>
          <View style={styles.metaCard}>
            {[{ l: "Registration no.", v: created.registration_no }, { l: "Name", v: `${created.first_name} ${created.last_name}` }, { l: "Status", v: created.status }].map((m) => (
              <View key={m.l} style={[s.between, { paddingVertical: 6 }]}><Text style={styles.metaLabel}>{m.l.toUpperCase()}</Text><Text style={styles.metaValue}>{m.v}</Text></View>
            ))}
          </View>
        </Animated.View>
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 16, gap: 10 }}>
          <Button label="View registration" onPress={() => (created.id ? router.replace(`/registrations/${created.id}`) : router.replace("/registrations"))} testID="registration-success-view" />
          <Button label="Back to registrations" variant="ghost" onPress={() => router.replace("/registrations")} testID="registration-success-back" />
        </View>
      </View>
    );
  }

  return (
    <View style={s.screen} testID="new-registration-screen">
      <Header title="New Registration" showBell={false} />
      <KeyboardAwareScrollView bottomOffset={110} contentContainerStyle={[s.content, { paddingBottom: 120, paddingTop: 8 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenTitle title="New Registration" subtitle="Register a channel partner, broker, influencer or freelancer with County Greens." />

        <SectionLabel>Category</SectionLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {PARTNER_TYPES.map((p) => <OptionTile key={p.key} label={p.key} icon={p.icon as any} selected={f.category === p.key} onPress={() => set("category")(p.key)} testID={`reg-category-${p.key.toLowerCase().replace(/\s+/g, "-")}`} style={{ width: "47%", flexGrow: 1 }} />)}
        </View>
        {errors.category ? <Text style={styles.err}>{errors.category}</Text> : null}
        <Pressable style={styles.scan} onPress={() => toast.show("Business card scanning will use the device camera", "info")} testID="scan-card-button">
          <View style={styles.scanIcon}><Ionicons name="scan-outline" size={20} color={colors.brandSecondary} /></View>
          <View style={{ flex: 1 }}><Text style={s.name}>Scan Business Card</Text><Text style={s.meta}>Quickly add details by scanning a business card</Text></View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>

        <SectionLabel style={{ marginTop: spacing.xl }}>Personal Details</SectionLabel>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field label="First name" placeholder="First Name" value={f.first_name} onChangeText={set("first_name")} error={errors.first_name} containerStyle={{ flex: 1 }} testID="reg-first-name" />
          <Field label="Last name" placeholder="Last Name" value={f.last_name} onChangeText={set("last_name")} containerStyle={{ flex: 1 }} testID="reg-last-name" />
        </View>
        <Field label="Mobile number" placeholder="Mobile Number" value={f.mobile} onChangeText={set("mobile")} keyboardType="phone-pad" icon="call-outline" error={errors.mobile} testID="reg-mobile" />
        <Field label="Email address" placeholder="Email Address" value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" error={errors.email} testID="reg-email" />

        <SectionLabel>Address</SectionLabel>
        <Field label="Address" placeholder="Street / Locality" value={f.address} onChangeText={set("address")} icon="location-outline" testID="reg-address" />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field label="City" placeholder="City" value={f.city} onChangeText={set("city")} error={errors.city} containerStyle={{ flex: 1 }} testID="reg-city" />
          <Field label="Pincode" placeholder="160001" value={f.pincode} onChangeText={set("pincode")} keyboardType="number-pad" maxLength={6} error={errors.pincode} containerStyle={{ flex: 1 }} testID="reg-pincode" />
        </View>
        <Select label="State" value={f.state} options={STATES} onChange={set("state")} placeholder="Select state" testID="reg-state" />

        <SectionLabel>Professional Details</SectionLabel>
        {profile.entityLabel ? <Field label="Company / Firm" placeholder="Company Name" value={f.company} onChangeText={set("company")} icon="business-outline" testID="reg-company" /> : null}
        <Select label="Project" value={f.project} options={["County Greens"]} onChange={set("project")} icon="home-outline" testID="reg-project" />

        {f.category && profile.rera ? (
          <>
            <Text style={styles.fieldLabel}>{profile.rera === "optional" ? "RERA CERTIFICATE (OPTIONAL)" : "RERA CERTIFICATE"}</Text>
            <View style={[styles.docRow, !!errors.rera && { borderColor: colors.error }]} testID="reg-rera-doc">
              <View style={[styles.docIcon, !!f.rera_file && { backgroundColor: colors.forestSoft }]}>
                <Ionicons name={f.rera_file ? "document-text" : "document-text-outline"} size={20} color={f.rera_file ? colors.brandPrimary : colors.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{RERA_CERTIFICATE}</Text>
                <Text style={s.meta}>{f.rera_file || "Upload the RERA registration certificate (PDF / image)"}</Text>
                <View style={{ marginTop: 6 }}><Badge label={f.rera_file ? "Uploaded" : profile.rera === "required" ? "Required" : "Optional"} small /></View>
              </View>
              <Pressable
                onPress={() => {
                  set("rera_file")("rera-certificate.pdf");
                  toast.show("RERA certificate attached", "success");
                }}
                style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.8 }]}
                testID="reg-rera-upload"
              >
                <Ionicons name={f.rera_file ? "refresh-outline" : "cloud-upload-outline"} size={14} color={colors.brandPrimary} />
                <Text style={styles.uploadText}>{f.rera_file ? "Replace" : "Upload"}</Text>
              </Pressable>
            </View>
            {errors.rera ? <Text style={styles.err}>{errors.rera}</Text> : null}
          </>
        ) : null}

        {profile.social && f.category ? (
          <>
            <SectionLabel style={{ marginTop: spacing.lg }}>Social Media</SectionLabel>
            <Field label="Instagram" placeholder="Instagram profile link" value={f.instagram} onChangeText={set("instagram")} autoCapitalize="none" icon="logo-instagram" testID="reg-instagram" />
            <Field label="YouTube" placeholder="YouTube channel link" value={f.youtube} onChangeText={set("youtube")} autoCapitalize="none" icon="logo-youtube" testID="reg-youtube" />
            <Field label="Facebook" placeholder="Facebook profile link" value={f.facebook} onChangeText={set("facebook")} autoCapitalize="none" icon="logo-facebook" error={errors.social} testID="reg-facebook" />
          </>
        ) : null}
        <View style={{ height: spacing.lg }} />
        <Field label="Notes" placeholder="Optional remarks" value={f.notes} onChangeText={set("notes")} multiline testID="reg-notes" />
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Button label="Submit registration" icon="checkmark" variant="gold" onPress={submit} loading={create.isPending} testID="wizard-submit-button" />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  err: { fontFamily: fonts.body, fontSize: 12, color: colors.error, marginTop: 6 },
  fieldLabel: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.4, color: colors.onSurfaceTertiary, marginBottom: 8 },
  docRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  docIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.brandPrimary },
  uploadText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.brandPrimary },
  scan: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: spacing.lg, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.brandSecondary, backgroundColor: colors.goldSoft },
  scanIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceInverse, alignItems: "center", justifyContent: "center" },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  successIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center", marginBottom: spacing.xl, shadowColor: colors.brandSecondary, shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  successTitle: { fontFamily: fonts.display, fontSize: 34, color: colors.onSurface, textAlign: "center" },
  successBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.muted, textAlign: "center", marginTop: 10 },
  metaCard: { marginTop: spacing.xl, alignSelf: "stretch", backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  metaLabel: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.2, color: colors.muted },
  metaValue: { fontFamily: fonts.medium, fontSize: 13, color: colors.onSurface },
}));
