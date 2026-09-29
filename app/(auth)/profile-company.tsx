import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { put, User } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Badge, Button, Field, Header, ScreenTitle, SectionLabel, StepIndicator, useScreenStyles } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

type Doc = { type: string; hint: string; required: boolean; status: "Required" | "Optional" | "Uploaded"; file_name?: string };

const DOCS: Doc[] = [
  { type: "Certificate of Incorporation", hint: "For companies / LLPs", required: false, status: "Optional" },
  { type: "Partnership Deed", hint: "Only for Partnership Firms", required: false, status: "Optional" },
  { type: "LLP Registration Certificate", hint: "Only for LLP Entities", required: false, status: "Optional" },
  { type: "GST Registration Certificate", hint: "GSTIN copy (Required)", required: true, status: "Required" },
  { type: "RERA Certificate", hint: "Channel partner RERA registration (Required)", required: true, status: "Required" },
];

// Screen 7 · Complete Profile · Step 3 (Company & Documents)
export default function ProfileCompany() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, setUser } = useAuth();
  const [company, setCompany] = useState(user?.company_name ?? "");
  const [docs, setDocs] = useState<Doc[]>(() =>
    DOCS.map((d) => {
      const existing = user?.documents?.find((x) => x.type === d.type);
      return existing ? { ...d, status: "Uploaded", file_name: existing.file_name } : d;
    }),
  );
  const [err, setErr] = useState<string | undefined>();

  // Demo upload: marks the document as uploaded (file picker to be wired to Object Storage).
  const upload = (i: number) => {
    setDocs((d) => d.map((x, idx) => (idx === i ? { ...x, status: "Uploaded", file_name: `${x.type.toLowerCase().replace(/\s+/g, "-")}.pdf` } : x)));
    toast.show("Document attached", "success");
  };

  const save = useMutation({
    mutationFn: () =>
      put<User>("/me", {
        company_name: company.trim(),
        documents: docs.filter((d) => d.status === "Uploaded").map((d) => ({ type: d.type, status: "Under Review", file_name: d.file_name })),
        profile_step: 4,
        profile_completed: true,
      }),
    onSuccess: (u) => {
      setUser(u);
      router.replace("/(auth)/welcome");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const submit = () => {
    if (!company.trim()) return setErr("Company / entity name is required");
    const missing = docs.filter((d) => d.required && d.status !== "Uploaded");
    if (missing.length) {
      setErr(undefined);
      return toast.show(`Please upload: ${missing.map((m) => m.type).join(", ")}`, "error");
    }
    setErr(undefined);
    save.mutate();
  };

  return (
    <View style={s.screen} testID="profile-company-screen">
      <Header showBell={false} />
      <KeyboardAwareScrollView bottomOffset={110} contentContainerStyle={[s.content, { paddingBottom: 120, paddingTop: 8 }]} keyboardShouldPersistTaps="handled">
        <StepIndicator step={4} total={4} />
        <ScreenTitle title="Complete Profile" subtitle="Please provide your company details and upload required documents." />

        <SectionLabel>Company Details</SectionLabel>
        <Field label="Company / Entity name" placeholder="Company / Entity Name" value={company} onChangeText={setCompany} rightIcon="business-outline" error={err} testID="company-entity-input" />

        <SectionLabel>Upload Documents</SectionLabel>
        <View style={{ gap: 10 }}>
          {docs.map((d, i) => (
            <View key={d.type} style={styles.docRow} testID={`doc-row-${i}`}>
              <View style={[styles.docIcon, d.status === "Uploaded" && { backgroundColor: colors.forestSoft }]}>
                <Ionicons name={d.status === "Uploaded" ? "document-text" : "document-text-outline"} size={20} color={d.status === "Uploaded" ? colors.brandPrimary : colors.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.docTitle}>{d.type}</Text>
                <Text style={styles.docHint}>{d.file_name ?? d.hint}</Text>
                <View style={{ marginTop: 6 }}>
                  <Badge label={d.status === "Uploaded" ? "Uploaded" : d.required ? "Required" : "Optional"} small />
                </View>
              </View>
              <Pressable testID={`doc-upload-${i}`} onPress={() => upload(i)} style={({ pressed }) => [styles.uploadBtn, d.status === "Uploaded" && styles.uploadBtnDone, pressed && { opacity: 0.8 }]}>
                <Ionicons name={d.status === "Uploaded" ? "refresh-outline" : "cloud-upload-outline"} size={14} color={colors.brandPrimary} />
                <Text style={styles.uploadText}>{d.status === "Uploaded" ? "Replace" : "Upload"}</Text>
              </Pressable>
            </View>
          ))}
        </View>
        <Text style={[s.caption, { marginTop: spacing.lg }]}>Documents are verified by the County Green partner desk within 2–3 working days.</Text>
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + 16 }}>
          <Button label="Submit application" icon="checkmark" variant="gold" onPress={submit} loading={save.isPending} testID="profile-submit-button" />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  docRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  docIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  docTitle: { fontFamily: fonts.medium, fontSize: 14, color: colors.onSurface },
  docHint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, minHeight: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.brandPrimary },
  uploadBtnDone: { backgroundColor: colors.forestSoft, borderColor: colors.forestSoft },
  uploadText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.brandPrimary },
}));
