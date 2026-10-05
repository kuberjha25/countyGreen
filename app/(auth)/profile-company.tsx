import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { put, User } from "@/src/api";
import { useAuth } from "@/src/auth";
import { DocSpec, partnerDocuments } from "@/src/brand";
import { Badge, Button, Header, ScreenTitle, SectionLabel, StepIndicator, useScreenStyles } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

type Doc = DocSpec & { file_name?: string };

// Screen 7 · Complete Profile · Step 4 (Documents — list depends on partner type & entity).
// RERA is collected only as an uploaded certificate, never as a typed number.
export default function ProfileCompany() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, setUser } = useAuth();
  const wasCompleted = !!user?.profile_completed;
  const [docs, setDocs] = useState<Doc[]>(() =>
    partnerDocuments(user?.partner_type, user?.entity_type).map((d) => {
      const existing = user?.documents?.find((x) => x.type === d.type);
      return existing ? { ...d, file_name: existing.file_name ?? "uploaded" } : d;
    }),
  );

  // Demo upload: marks the document as uploaded (file picker to be wired to Object Storage).
  const upload = (i: number) => {
    setDocs((d) => d.map((x, idx) => (idx === i ? { ...x, file_name: `${x.type.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf` } : x)));
    toast.show("Document attached", "success");
  };

  const save = useMutation({
    mutationFn: () =>
      put<User>("/me", {
        documents: docs
          .filter((d) => d.file_name)
          .map((d) => ({ type: d.type, status: user?.documents?.find((x) => x.type === d.type)?.status ?? "Under Review", file_name: d.file_name })),
        profile_step: 4,
        profile_completed: true,
      }),
    onSuccess: (u) => {
      setUser(u);
      if (wasCompleted) {
        toast.show("Profile updated", "success");
        router.dismissTo("/(tabs)/profile");
      } else {
        router.replace("/(auth)/welcome");
      }
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const submit = () => {
    const missing = docs.filter((d) => d.required && !d.file_name);
    if (missing.length) return toast.show(`Please upload: ${missing.map((m) => m.type).join(", ")}`, "error");
    save.mutate();
  };

  return (
    <View style={s.screen} testID="profile-company-screen">
      <Header showBell={false} />
      <KeyboardAwareScrollView bottomOffset={110} contentContainerStyle={[s.content, { paddingBottom: 120, paddingTop: 8 }]} keyboardShouldPersistTaps="handled">
        <StepIndicator step={4} total={4} />
        <ScreenTitle eyebrow={(user?.partner_type ?? "Channel Partner").toUpperCase()} title="Complete Profile" subtitle="Please upload the documents required for your registration." />

        <SectionLabel>Upload Documents</SectionLabel>
        <View style={{ gap: 10 }}>
          {docs.map((d, i) => {
            const uploaded = !!d.file_name;
            return (
              <View key={d.type} style={styles.docRow} testID={`doc-row-${i}`}>
                <View style={[styles.docIcon, uploaded && { backgroundColor: colors.forestSoft }]}>
                  <Ionicons name={uploaded ? "document-text" : "document-text-outline"} size={20} color={uploaded ? colors.brandPrimary : colors.muted} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docTitle}>{d.type}</Text>
                  <Text style={styles.docHint}>{d.file_name ?? d.hint}</Text>
                  <View style={{ marginTop: 6 }}>
                    <Badge label={uploaded ? "Uploaded" : d.required ? "Required" : "Optional"} small />
                  </View>
                </View>
                <Pressable testID={`doc-upload-${i}`} onPress={() => upload(i)} style={({ pressed }) => [styles.uploadBtn, uploaded && styles.uploadBtnDone, pressed && { opacity: 0.8 }]}>
                  <Ionicons name={uploaded ? "refresh-outline" : "cloud-upload-outline"} size={14} color={colors.brandPrimary} />
                  <Text style={styles.uploadText}>{uploaded ? "Replace" : "Upload"}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
        <Text style={[s.caption, { marginTop: spacing.lg }]}>Documents are verified by the County Greens partner desk within 2–3 working days.</Text>
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + 16 }}>
          <Button label={wasCompleted ? "Save changes" : "Submit application"} icon="checkmark" variant="gold" onPress={submit} loading={save.isPending} testID="profile-submit-button" />
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
