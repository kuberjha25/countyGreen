import Ionicons from "@react-native-vector-icons/ionicons";
import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { appendFile, errorMessage, mimeOf, PickedFile } from "@/src/api";
import { partnerTypeName } from "@/src/brand";
import { Badge, Button, ErrorState, Header, Loading, ScreenTitle, SectionLabel, StepIndicator, useScreenStyles } from "@/src/components/ui";
import { useCpDocuments } from "@/src/lookups";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { selfRegister } from "@/src/store/authSlice";
import { fetchCpDocuments } from "@/src/store/lookupsSlice";
import { useRun } from "@/src/store/useRun";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

const MAX_BYTES = 5 * 1024 * 1024;
// Draft keys sent to POST /api/registrations (employee_name is only for display).
const FIELDS = ["partner_type", "first_name", "last_name", "mobile", "email", "address", "city", "state", "pincode", "knows_employee", "employee_id", "company_name", "business_type", "facebook_link", "instagram_link", "youtube_link"];

// Screen 7 · Partner registration · Step 4 (documents + submit).
// Channel partners upload the documents Admin configured (GET /api/cp-documents);
// RERA is collected only as an uploaded certificate, never as a typed number.
export default function ProfileCompany() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const draft = useAppSelector((st) => st.auth.draft);
  const isCp = draft.partner_type === "channel_partner";
  const docs = useCpDocuments();
  const [files, setFiles] = useState<Record<string, PickedFile>>({});
  const [run, submitting] = useRun();

  const pick = async (key: string) => {
    const r = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png"], copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    if (a.size && a.size > MAX_BYTES) return toast.show("File must be 5 MB or smaller", "error");
    const picked: PickedFile = { uri: a.uri, name: a.name, mimeType: a.mimeType ?? undefined, file: (a as any).file };
    if (!["application/pdf", "image/jpeg", "image/png"].includes(mimeOf(picked))) return toast.show("Only JPG, PNG or PDF files can be uploaded", "error");
    setFiles((f) => ({ ...f, [key]: picked }));
  };

  const submit = async () => {
    const list = isCp ? docs.data ?? [] : [];
    const missing = list.filter((d) => d.is_mandatory && !files[d.field_key]);
    if (missing.length) return toast.show(`Please upload: ${missing.map((m) => m.name).join(", ")}`, "error");
    const values = Object.fromEntries(FIELDS.map((k) => [k, draft[k] ?? ""]).filter(([k, v]) => v !== "" && !(k === "employee_id" && draft.knows_employee !== "yes")));
    let payload: FormData | Record<string, string> = values;
    if (isCp) {
      const form = new FormData();
      Object.entries(values).forEach(([k, v]) => form.append(k, String(v)));
      list.forEach((d) => files[d.field_key] && appendFile(form, `documents[${d.field_key}]`, files[d.field_key]));
      payload = form;
    }
    try {
      await run(selfRegister(payload));
      router.replace("/(auth)/welcome");
    } catch (e) {
      toast.show(errorMessage(e), "error");
    }
  };

  return (
    <View style={s.screen} testID="profile-company-screen">
      <Header showBell={false} />
      <KeyboardAwareScrollView bottomOffset={110} contentContainerStyle={[s.content, { paddingBottom: 120, paddingTop: 8 }]} keyboardShouldPersistTaps="handled">
        <StepIndicator step={4} total={4} />
        <ScreenTitle eyebrow={partnerTypeName(draft.partner_type).toUpperCase()} title="Complete Profile" subtitle={isCp ? "Please upload the documents required for your registration." : "Review and submit your registration."} />

        {isCp ? (
          <>
            <SectionLabel>Upload Documents</SectionLabel>
            {docs.status === "loading" ? <Loading /> : docs.status === "failed" ? <ErrorState message={docs.error ?? "Could not load the document list"} onRetry={() => dispatch(fetchCpDocuments())} /> : null}
            {docs.status === "succeeded" && !(docs.data ?? []).length ? <Text style={s.bodyMuted}>No documents are required right now.</Text> : null}
            <View style={{ gap: 10 }}>
              {(docs.data ?? []).map((d) => {
                const f = files[d.field_key];
                return (
                  <View key={d.id} style={styles.docRow} testID={`doc-row-${d.field_key}`}>
                    <View style={[styles.docIcon, !!f && { backgroundColor: colors.forestSoft }]}>
                      <Ionicons name={f ? "document-text" : "document-text-outline"} size={20} color={f ? colors.brandPrimary : colors.muted} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docTitle}>{d.name}</Text>
                      <Text style={styles.docHint} numberOfLines={1}>{f?.name ?? "JPG, PNG or PDF · max 5 MB"}</Text>
                      <View style={{ marginTop: 6 }}><Badge label={f ? "Uploaded" : d.is_mandatory ? "Required" : "Optional"} small /></View>
                    </View>
                    <Pressable testID={`doc-upload-${d.field_key}`} onPress={() => pick(d.field_key)} style={({ pressed }) => [styles.uploadBtn, !!f && styles.uploadBtnDone, pressed && { opacity: 0.8 }]}>
                      <Ionicons name={f ? "refresh-outline" : "cloud-upload-outline"} size={14} color={colors.brandPrimary} />
                      <Text style={styles.uploadText}>{f ? "Replace" : "Upload"}</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        <SectionLabel style={{ marginTop: spacing.xl }}>Summary</SectionLabel>
        <View style={styles.summary}>
          {[
            ["Name", `${draft.first_name ?? ""} ${draft.last_name ?? ""}`.trim()],
            ["Mobile", draft.mobile],
            ["Email", draft.email],
            ["Company", draft.company_name],
            ["City", [draft.city, draft.state].filter(Boolean).join(", ")],
            ["Associated employee", draft.knows_employee === "yes" ? draft.employee_name : "No"],
          ]
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <View key={k} style={[s.between, { paddingVertical: 6 }]}>
                <Text style={s.caption}>{k}</Text>
                <Text style={[s.body, { fontSize: 14, flexShrink: 1, textAlign: "right" }]}>{v}</Text>
              </View>
            ))}
        </View>
        <Text style={[s.caption, { marginTop: spacing.lg }]}>Your registration is reviewed by the County Green partner desk.</Text>
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + 16 }}>
          <Button label="Submit application" icon="checkmark" variant="gold" onPress={submit} loading={submitting} testID="profile-submit-button" />
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
  summary: { padding: 14, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
}));
