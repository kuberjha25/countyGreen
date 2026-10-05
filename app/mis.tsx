import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get } from "@/src/api";
import { BottomNav, Card, ErrorState, Header, Loading, SectionLabel, Stat, useScreenStyles } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

const PERIODS = ["daily", "weekly", "monthly"] as const;

function Ring({ value, label, tone }: { value: number; label: string; tone: string }) {
  // Lightweight ring: thick circular border with a filled overlay proportional to value.
  const styles = useStyles();
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(100, value));
  return (
    <View style={{ alignItems: "center", width: 96 }}>
      <View style={styles.ring}>
        <View style={[styles.ringFill, { borderColor: tone, opacity: pct === 0 ? 0 : 1, transform: [{ rotate: `${-90 + (pct / 100) * 180}deg` }] }]} />
        <View style={styles.ringInner}>
          <Text style={[styles.ringText, { color: colors.onSurface }]}>{pct}%</Text>
        </View>
      </View>
      <Text style={styles.ringLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

function Bars({ rows, total }: { rows: { label: string; value: number; tone: string }[]; total: number }) {
  const s = useScreenStyles();
  const styles = useStyles();
  return (
    <View style={{ flex: 1, gap: 10 }}>
      {rows.map((r) => (
        <View key={r.label}>
          <View style={s.between}>
            <Text style={s.caption}>{r.label}</Text>
            <Text style={[s.caption, { fontFamily: fonts.semibold }]}>{r.value}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { backgroundColor: r.tone, width: `${total ? Math.round((r.value / total) * 100) : 0}%` }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Screen 19 · MIS Report
export default function Mis() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("monthly");
  const mis = useQuery({ queryKey: ["mis", period], queryFn: () => get(`/mis?period=${period}`) });
  const d = mis.data;

  return (
    <View style={s.screen} testID="mis-screen">
      <Header title="MIS Report" />
      {mis.isLoading ? <Loading /> : mis.isError || !d ? <ErrorState message={(mis.error as Error)?.message ?? "Failed"} onRetry={mis.refetch} /> : (
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 24 }]} refreshControl={<RefreshControl refreshing={mis.isRefetching} onRefresh={mis.refetch} tintColor={colors.brandPrimary} />} showsVerticalScrollIndicator={false}>
          <Text style={[s.h2, { fontSize: 30 }]}>Performance Summary</Text>
          <View style={[s.between, { marginTop: spacing.md, marginBottom: spacing.lg }]}>
            <View style={styles.segment}>
              {PERIODS.map((p) => (
                <Pressable key={p} onPress={() => setPeriod(p)} style={[styles.segBtn, period === p && styles.segSel]} testID={`mis-period-${p}`}>
                  <Text style={[styles.segText, period === p && { color: colors.onBrandPrimary }]}>{p[0].toUpperCase() + p.slice(1)}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => toast.show("Report download will be available soon", "info")} style={styles.download} testID="mis-download-button">
              <Ionicons name="download-outline" size={16} color={colors.brandSecondary} />
              <Text style={styles.downloadText}>Export</Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Stat value={d.leads.total} label="Total leads" testID="stat-leads" />
            <Stat value={d.visits.total} label="Total visits" tone="gold" testID="stat-visits" />
            <Stat value={d.registrations.total} label="Registrations" tone="muted" testID="stat-registrations" />
          </View>
          <Text style={[s.caption, { marginTop: 8 }]}>{d.leads.recent} new lead{d.leads.recent === 1 ? "" : "s"} and {d.visits.recent} visit{d.visits.recent === 1 ? "" : "s"} added in this period.</Text>

          <SectionLabel style={{ marginTop: spacing.xl }}>Conversion</SectionLabel>
          <Card style={{ flexDirection: "row", justifyContent: "space-around", paddingVertical: spacing.xl }}>
            <Ring value={d.conversion_rate} label="Lead conversion" tone={colors.brandPrimary} />
            <Ring value={d.visit_rate} label="Visits attended" tone={colors.brandSecondary} />
          </Card>

          <SectionLabel style={{ marginTop: spacing.xl }}>Leads Summary</SectionLabel>
          <Card>
            <Bars total={d.leads.total} rows={[{ label: "In Progress", value: d.leads.in_progress, tone: colors.warning }, { label: "Converted", value: d.leads.converted, tone: colors.success }, { label: "Not Matured", value: d.leads.not_matured, tone: colors.muted }]} />
          </Card>

          <SectionLabel style={{ marginTop: spacing.xl }}>Visits Summary</SectionLabel>
          <Card>
            <Bars total={d.visits.total} rows={[{ label: "Attended", value: d.visits.attended, tone: colors.brandPrimary }, { label: "In Progress", value: d.visits.in_progress, tone: colors.brandSecondary }]} />
          </Card>

          <SectionLabel style={{ marginTop: spacing.xl }}>Registrations by Category</SectionLabel>
          <Card>
            <Bars total={d.registrations.total} rows={Object.entries(d.registrations.by_category ?? {}).map(([k, v]: any, i) => ({ label: k, value: v, tone: [colors.brandPrimary, colors.brandSecondary, colors.brandTertiary, colors.warning][i % 4] }))} />
            <View style={[s.between, { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.divider }]}>
              <Text style={s.caption}>Pending {d.registrations.pending}</Text>
              <Text style={s.caption}>Completed {d.registrations.completed}</Text>
            </View>
          </Card>
        </ScrollView>
      )}
      <BottomNav />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  segment: { flexDirection: "row", backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, padding: 3 },
  segBtn: { height: 34, paddingHorizontal: 14, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  segSel: { backgroundColor: colors.brandPrimary },
  segText: { fontFamily: fonts.medium, fontSize: 12, color: colors.onSurfaceTertiary },
  download: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.brandSecondary },
  downloadText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.brandSecondary },
  ring: { width: 84, height: 84, borderRadius: 42, borderWidth: 8, borderColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  ringFill: { position: "absolute", width: 84, height: 84, borderRadius: 42, borderWidth: 8, top: -8, left: -8, borderBottomColor: "transparent", borderLeftColor: "transparent" },
  ringInner: { alignItems: "center", justifyContent: "center" },
  ringText: { fontFamily: fonts.display, fontSize: 22 },
  ringLabel: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1, color: colors.muted, marginTop: 8, textAlign: "center" },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceTertiary, marginTop: 6, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
}));
