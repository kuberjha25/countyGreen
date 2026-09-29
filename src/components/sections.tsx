import Ionicons from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useScreenStyles } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { fmtDateTime } from "@/src/format";

export type Section = { key: string; label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; render: () => React.ReactNode };

// Horizontal section switcher for detail screens. The active section is driven
// by ?section= so each section is a distinct, linkable screen.
export function SectionTabs({ sections, testIDPrefix = "section-tab" }: { sections: Section[]; testIDPrefix?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string }>();
  const active = sections.find((s) => s.key === params.section) ?? sections[0];
  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 56, flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.lg, alignItems: "center" }}>
        {sections.map((s) => {
          const sel = s.key === active.key;
          return (
            <Pressable key={s.key} onPress={() => router.setParams({ section: s.key })} style={[styles.chip, sel && styles.chipSel]} testID={`${testIDPrefix}-${s.key}`}>
              <Ionicons name={s.icon} size={14} color={sel ? colors.onBrandPrimary : colors.onSurfaceTertiary} />
              <Text style={[styles.chipText, sel && { color: colors.onBrandPrimary }]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View key={active.key} testID={`section-content-${active.key}`}>{active.render()}</View>
    </>
  );
}

export function Timeline({ items }: { items: { title: string; detail?: string; at?: string }[] }) {
  const s = useScreenStyles();
  const styles = useStyles();
  if (!items?.length) return <Text style={s.bodyMuted}>No activity recorded yet.</Text>;
  return (
    <View testID="timeline">
      {items.map((h, i) => (
        <View key={i} style={styles.tlRow}>
          <View style={{ alignItems: "center", width: 20 }}>
            <View style={[styles.tlDot, i === 0 && styles.tlDotActive]} />
            {i < items.length - 1 ? <View style={styles.tlLine} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: 18 }}>
            <Text style={s.caption}>{fmtDateTime(h.at)}</Text>
            <Text style={[s.name, { marginTop: 2 }]}>{h.title}</Text>
            {h.detail ? <Text style={[s.bodyMuted, { marginTop: 2 }]}>{h.detail}</Text> : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  chip: { height: 36, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  chipSel: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.onSurfaceTertiary },
  tlRow: { flexDirection: "row", gap: 12 },
  tlDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border, marginTop: 4 },
  tlDotActive: { backgroundColor: colors.brandSecondary },
  tlLine: { flex: 1, width: 2, backgroundColor: colors.divider, marginTop: 4 },
}));
