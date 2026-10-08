import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";

import { put } from "@/src/api";
import { useCan } from "@/src/auth";
import { DocRule, PARTNER_TYPES, PartnerType, RegDocConfig } from "@/src/brand";
import { BottomNav, Button, Header, ScreenTitle, Segmented, useScreenStyles } from "@/src/components/ui";
import { useRegDocs } from "@/src/lookups";
import { fonts, makeStyles, radius, spacing } from "@/src/theme";
import { useToast } from "@/src/toast";

const RULES: readonly DocRule[] = ["hidden", "optional", "mandatory"];
const LABELS: Record<DocRule, string> = { hidden: "Hidden", optional: "Optional", mandatory: "Mandatory" };

// Admin · CP Registration Documents — which of the registration documents are displayed
// during registration and which of them are mandatory, for each partner type.
export default function RegistrationDocs() {
  const s = useScreenStyles();
  const styles = useStyles();
  const toast = useToast();
  const qc = useQueryClient();
  const can = useCan();
  const config = useRegDocs();
  // Unsaved edits; null = showing the saved configuration.
  const [draft, setDraft] = useState<RegDocConfig[] | null>(null);
  const docs = draft ?? config;
  const editable = can("reg_documents", "edit");

  const setRule = (id: string, t: PartnerType, rule: DocRule) => setDraft(docs.map((d) => (d.id === id ? { ...d, rules: { ...d.rules, [t]: rule } } : d)));

  const save = useMutation({
    mutationFn: () => put("/reg-documents", { items: docs }),
    onSuccess: () => {
      qc.setQueryData(["reg-documents"], docs);
      qc.invalidateQueries({ queryKey: ["reg-documents"] });
      setDraft(null);
      toast.show("Registration documents saved", "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  return (
    <View style={s.screen} testID="reg-docs-screen">
      <Header title="Registration Documents" />
      <ScrollView contentContainerStyle={[s.content, { paddingTop: 8, paddingBottom: 24 }]} showsVerticalScrollIndicator={false}>
        <ScreenTitle title="CP Registration Documents" subtitle="Choose which documents are displayed during registration and which of them are mandatory." />
        <View style={{ gap: 12 }}>
          {docs.map((d) => (
            <View key={d.id} style={styles.card} testID={`reg-doc-config-${d.id}`}>
              <Text style={s.name}>{d.type}</Text>
              <Text style={s.meta}>{d.hint}{d.entity_types?.length ? ` · only for ${d.entity_types.join(", ")}` : ""}</Text>
              <View style={{ gap: 8, marginTop: spacing.md }}>
                {PARTNER_TYPES.map((t) => (
                  <View key={t.key} style={styles.ruleRow}>
                    <Text style={styles.type}>{t.short}</Text>
                    <View style={{ flex: 1 }} pointerEvents={editable ? "auto" : "none"}>
                      <Segmented options={RULES} labels={LABELS} value={d.rules[t.key] ?? "hidden"} onChange={(r) => setRule(d.id, t.key, r)} testIDPrefix={`reg-doc-${d.id}-${t.short.toLowerCase()}`} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      {editable && draft ? (
        <View style={styles.footer}>
          <Button label="Save changes" icon="checkmark" variant="gold" onPress={() => save.mutate()} loading={save.isPending} testID="reg-docs-save" />
        </View>
      ) : null}
      <BottomNav active="profile" />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  type: { width: 76, fontFamily: fonts.semibold, fontSize: 12, color: colors.onSurfaceTertiary },
  footer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
}));
