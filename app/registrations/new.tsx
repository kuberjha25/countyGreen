import Ionicons from "@react-native-vector-icons/ionicons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { appendFile, errorMessage, mimeOf, lookupPincode, PickedFile } from "@/src/api";
import { PARTNER_TYPES, STATES } from "@/src/brand";
import { ReferenceChooser } from "@/src/components/partners";
import { Badge, Button, ChoiceChips, Field, Header, OptionTile, ScreenTitle, SectionLabel, Select, useScreenStyles } from "@/src/components/ui";
import { digits } from "@/src/format";
import { useCpDocuments } from "@/src/lookups";
import { adminRegister } from "@/src/store/registrationsSlice";
import { useRun } from "@/src/store/useRun";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";
import { ApiPartnerType, BUSINESS_TYPES, Reference } from "@/src/types";

const MAX_BYTES = 5 * 1024 * 1024;
const EMPTY = { first_name: "", last_name: "", mobile: "", email: "", address: "", pincode: "", city: "", state: "", company_name: "", business_type: "", facebook_link: "", instagram_link: "", youtube_link: "" };

// Screen 11 · New Registration by staff (POST /api/admin/registrations). The partner's mobile
// is then verified by OTP (registrations/verify). Documents follow GET /api/cp-documents.
export default function NewRegistration() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const docs = useCpDocuments();
  const [type, setType] = useState<ApiPartnerType | "">("");
  const [f, setF] = useState(EMPTY);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const [knows, setKnows] = useState(false);
  const [employee, setEmployee] = useState<Reference | null>(null);
  const [files, setFiles] = useState<Record<string, PickedFile>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [run, saving] = useRun();
  const isCp = type === "channel_partner";
  const isInfluencer = type === "influencer";

  const onPincode = async (v: string) => {
    const pin = digits(v).slice(0, 6);
    set("pincode")(pin);
    const r = await lookupPincode(pin);
    if (r) setF((x) => ({ ...x, city: r.city, state: r.state }));
  };

  const pick = async (key: string) => {
    const r = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png"], copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    if (a.size && a.size > MAX_BYTES) return toast.show("File must be 5 MB or smaller", "error");
    const picked: PickedFile = { uri: a.uri, name: a.name, mimeType: a.mimeType ?? undefined, file: (a as any).file };
    if (!["application/pdf", "image/jpeg", "image/png"].includes(mimeOf(picked))) return toast.show("Only JPG, PNG or PDF files can be uploaded", "error");
    setFiles((x) => ({ ...x, [key]: picked }));
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!type) e.type = "Select a category";
    if (!f.first_name.trim()) e.first_name = "First name is required";
    if (!f.last_name.trim()) e.last_name = "Last name is required";
    if (digits(f.mobile).length !== 10) e.mobile = "Enter a valid 10-digit mobile number";
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Enter a valid email";
    if (isCp && !f.company_name.trim()) e.company_name = "Company / firm name is required";
    if (isCp && !f.business_type) e.business_type = "Select the type of business";
    if (knows && !employee) e.employee = "Select the employee";
    const missing = isCp ? (docs.data ?? []).filter((d) => d.is_mandatory && !files[d.field_key]) : [];
    if (missing.length) e.docs = `Please upload: ${missing.map((d) => d.name).join(", ")}`;
    setErrors(e);
    if (Object.keys(e).length) return toast.show(e.type ?? e.docs ?? "Please correct the highlighted fields", "error");

    const values: Record<string, string> = { partner_type: type, first_name: f.first_name.trim(), last_name: f.last_name.trim(), mobile: digits(f.mobile), knows_employee: knows ? "yes" : "no" };
    if (knows && employee) values.employee_id = String(employee.id);
    for (const k of ["email", "address", "pincode", "city", "state"] as const) if (f[k].trim()) values[k] = f[k].trim();
    if (isCp) Object.assign(values, { company_name: f.company_name.trim(), business_type: f.business_type });
    if (isInfluencer) for (const k of ["facebook_link", "instagram_link", "youtube_link"] as const) if (f[k].trim()) values[k] = f[k].trim();
    let payload: FormData | Record<string, string> = values;
    if (isCp) {
      const form = new FormData();
      Object.entries(values).forEach(([k, v]) => form.append(k, v));
      (docs.data ?? []).forEach((d) => files[d.field_key] && appendFile(form, `documents[${d.field_key}]`, files[d.field_key]));
      payload = form;
    }
    try {
      const r = await run<{ message: string; requires_otp?: boolean; mobile?: string }>(adminRegister(payload));
      toast.show(r.message || "Registration saved", "success");
      if (r.requires_otp) router.replace({ pathname: "/registrations/verify" as any, params: { mobile: r.mobile ?? values.mobile } });
      else router.replace("/registrations");
    } catch (err) {
      toast.show(errorMessage(err), "error");
    }
  };

  return (
    <View style={s.screen} testID="new-registration-screen">
      <Header title="New Registration" showBell={false} />
      <KeyboardAwareScrollView bottomOffset={110} contentContainerStyle={[s.content, { paddingBottom: 120, paddingTop: 8 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <ScreenTitle title="New Registration" subtitle="Register a channel partner, broker, influencer or freelancer with County Green." />

        <SectionLabel>Category</SectionLabel>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {PARTNER_TYPES.map((p) => <OptionTile key={p.key} label={p.key} icon={p.icon as any} selected={type === p.api} onPress={() => setType(p.api)} testID={`reg-category-${p.api}`} style={{ width: "47%", flexGrow: 1 }} />)}
        </View>
        {errors.type ? <Text style={styles.err}>{errors.type}</Text> : null}

        <SectionLabel style={{ marginTop: spacing.xl }}>Personal Details</SectionLabel>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field label="First name" placeholder="First Name" value={f.first_name} onChangeText={set("first_name")} error={errors.first_name} containerStyle={{ flex: 1 }} testID="reg-first-name" />
          <Field label="Last name" placeholder="Last Name" value={f.last_name} onChangeText={set("last_name")} error={errors.last_name} containerStyle={{ flex: 1 }} testID="reg-last-name" />
        </View>
        <Field label="Mobile number" placeholder="10-digit mobile number" value={f.mobile} onChangeText={(v) => set("mobile")(digits(v).slice(0, 10))} keyboardType="number-pad" maxLength={10} icon="call-outline" error={errors.mobile} testID="reg-mobile" />
        <Field label="Email address" placeholder="Email Address" value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" error={errors.email} testID="reg-email" />

        <SectionLabel>Address</SectionLabel>
        <Field label="Address" placeholder="Street / Locality" value={f.address} onChangeText={set("address")} icon="location-outline" testID="reg-address" />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field label="PIN code" placeholder="160001" value={f.pincode} onChangeText={onPincode} keyboardType="number-pad" maxLength={6} containerStyle={{ flex: 1 }} testID="reg-pincode" />
          <Field label="City" placeholder="City" value={f.city} onChangeText={set("city")} containerStyle={{ flex: 1 }} testID="reg-city" />
        </View>
        <Select label="State" value={f.state} options={STATES.includes(f.state) || !f.state ? STATES : [f.state, ...STATES]} onChange={set("state")} placeholder="Select state" testID="reg-state" />

        {isCp ? (
          <>
            <SectionLabel>Business Details</SectionLabel>
            <Field label="Company / Firm" placeholder="Company Name" value={f.company_name} onChangeText={set("company_name")} icon="business-outline" error={errors.company_name} testID="reg-company" />
            <ChoiceChips label="Type of business" value={BUSINESS_TYPES[f.business_type]} options={Object.values(BUSINESS_TYPES)} onChange={(v) => set("business_type")(Object.keys(BUSINESS_TYPES).find((k) => BUSINESS_TYPES[k] === v) ?? "")} error={errors.business_type} testID="reg-business-type" />
          </>
        ) : null}

        {isInfluencer ? (
          <>
            <SectionLabel>Social Media</SectionLabel>
            <Field label="Instagram" placeholder="https://instagram.com/…" value={f.instagram_link} onChangeText={set("instagram_link")} autoCapitalize="none" icon="logo-instagram" testID="reg-instagram" />
            <Field label="YouTube" placeholder="https://youtube.com/@…" value={f.youtube_link} onChangeText={set("youtube_link")} autoCapitalize="none" icon="logo-youtube" testID="reg-youtube" />
            <Field label="Facebook" placeholder="https://facebook.com/…" value={f.facebook_link} onChangeText={set("facebook_link")} autoCapitalize="none" icon="logo-facebook" testID="reg-facebook" />
          </>
        ) : null}

        <SectionLabel>County Green employee</SectionLabel>
        <ChoiceChips label="Does the partner know a County Green employee?" value={knows ? "Yes" : "No"} options={["Yes", "No"]} onChange={(v) => setKnows(v === "Yes")} testID="reg-knows-employee" />
        {knows ? <ReferenceChooser value={employee} onChange={setEmployee} userType="backoffice" label="Associated employee" error={errors.employee} testID="reg-employee" /> : null}

        {isCp && (docs.data ?? []).length ? (
          <>
            <SectionLabel>Documents</SectionLabel>
            <View style={{ gap: 10 }}>
              {(docs.data ?? []).map((d) => {
                const file = files[d.field_key];
                return (
                  <View key={d.id} style={[styles.docRow, !!errors.docs && d.is_mandatory && !file && { borderColor: colors.error }]} testID={`reg-doc-${d.field_key}`}>
                    <View style={[styles.docIcon, !!file && { backgroundColor: colors.forestSoft }]}>
                      <Ionicons name={file ? "document-text" : "document-text-outline"} size={20} color={file ? colors.brandPrimary : colors.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.name}>{d.name}</Text>
                      <Text style={s.meta} numberOfLines={1}>{file?.name ?? "JPG, PNG or PDF · max 5 MB"}</Text>
                      <View style={{ marginTop: 6 }}><Badge label={file ? "Uploaded" : d.is_mandatory ? "Required" : "Optional"} small /></View>
                    </View>
                    <Pressable onPress={() => pick(d.field_key)} style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.8 }]} testID={`reg-doc-upload-${d.field_key}`}>
                      <Ionicons name={file ? "refresh-outline" : "cloud-upload-outline"} size={14} color={colors.brandPrimary} />
                      <Text style={styles.uploadText}>{file ? "Replace" : "Upload"}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            {errors.docs ? <Text style={styles.err}>{errors.docs}</Text> : null}
          </>
        ) : null}
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Button label="Submit registration" icon="checkmark" variant="gold" onPress={submit} loading={saving} testID="wizard-submit-button" />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  err: { fontFamily: fonts.body, fontSize: 12, color: colors.error, marginTop: 6 },
  docRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  docIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.brandPrimary },
  uploadText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.brandPrimary },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
}));
