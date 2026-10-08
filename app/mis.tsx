import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get } from "@/src/api";
import { BottomNav, Card, ChipRow, ErrorState, Header, Loading, SectionLabel, Segmented, useScreenStyles } from "@/src/components/ui";
import { fmtDay } from "@/src/format";
import { inPeriod, kpis, Link, MisData, Period, PERIODS, REPORTS, ReportRow, toCsv } from "@/src/reports";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

const ALL_STAFF = "All staff";

function Bars({ rows, onPress }: { rows: ReportRow[]; onPress: (l: Link) => void }) {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const total = rows.reduce((n, r) => n + r.value, 0);
  const tones = [colors.brandPrimary, colors.brandSecondary, colors.brandTertiary, colors.warning, colors.info, colors.success];
  if (!rows.length) return <Text style={s.caption}>No data in this period.</Text>;
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r, i) => (
        <Pressable key={r.label} disabled={!r.link} onPress={() => r.link && onPress(r.link)} style={({ pressed }) => pressed && { opacity: 0.7 }} testID={`mis-row-${r.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
          <View style={s.between}>
            <Text style={[s.caption, { flex: 1 }]} numberOfLines={1}>{r.label}</Text>
            <Text style={[s.caption, { fontFamily: fonts.semibold, color: r.link ? colors.brandPrimary : colors.muted }]}>{r.value}{r.link ? "  ›" : ""}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { backgroundColor: tones[i % tones.length], width: `${total ? Math.max(2, Math.round((r.value / total) * 100)) : 0}%` }]} />
          </View>
        </Pressable>
      ))}
    </View>
  );
}

// Screen 19 · MIS Report — built from the report registry in src/reports.ts; every figure links to its records.
export default function Mis() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const [period, setPeriod] = useState<Period>("month");
  const [staff, setStaff] = useState(ALL_STAFF);
  const mis = useQuery({ queryKey: ["mis"], queryFn: () => get<MisData>("/mis") });
  const all = mis.data;
  const staffNames = useMemo(() => [ALL_STAFF, ...new Set((all?.leads ?? []).concat(all?.visits ?? []).map((x) => x.assigned_to).filter(Boolean))].sort((a, b) => (a === ALL_STAFF ? -1 : b === ALL_STAFF ? 1 : a.localeCompare(b))), [all]);
  const d = all ? inPeriod(all, period, staff === ALL_STAFF ? undefined : staff) : undefined;
  const reports = REPORTS.filter((r) => !r.staffOnly || all?.scope === "all");
  const k = d ? kpis(d) : undefined;
  const go = (l: Link) => router.push({ pathname: l.pathname as any, params: l.params });
  const groups = [...new Set(reports.map((r) => r.group))];

  const exportCsv = async () => {
    if (!d) return;
    const heading = `County Green MIS · ${PERIODS[period]}${staff !== ALL_STAFF ? ` · ${staff}` : ""} · ${fmtDay(new Date())}`;
    try {
      await Share.share({ title: "County Green MIS", message: toCsv(reports, d, heading) });
    } catch {
      toast.show("Sharing is not available on this device", "error");
    }
  };

  return (
    <View style={s.screen} testID="mis-screen">
      <Header title="MIS Report" />
      {mis.isLoading ? <Loading /> : mis.isError || !d || !k ? <ErrorState message={(mis.error as Error)?.message ?? "Failed"} onRetry={mis.refetch} /> : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} refreshControl={<RefreshControl refreshing={mis.isRefetching} onRefresh={mis.refetch} tintColor={colors.brandPrimary} />} showsVerticalScrollIndicator={false}>
          <View style={[s.content, { paddingBottom: spacing.sm }]}>
            <View style={s.between}>
              <Text style={[s.h2, { fontSize: 30 }]}>Performance</Text>
              <Pressable onPress={exportCsv} style={styles.download} testID="mis-download-button">
                <Ionicons name="share-outline" size={16} color={colors.brandSecondary} />
                <Text style={styles.downloadText}>Export CSV</Text>
              </Pressable>
            </View>
            <Text style={[s.bodyMuted, { marginBottom: spacing.md }]}>{all?.scope === "all" ? "All leads, visits and requests. Tap any figure to open the records." : "Your leads, visits and requests. Tap any figure to open the records."}</Text>
            <Segmented options={Object.keys(PERIODS) as Period[]} labels={PERIODS} value={period} onChange={setPeriod} testIDPrefix="mis-period" />
          </View>
          {all?.scope === "all" && staffNames.length > 2 ? <ChipRow options={staffNames} value={staff} onChange={setStaff} testIDPrefix="mis-staff" /> : null}

          <View style={s.content}>
            <View style={styles.kpis}>
              {[
                { v: k.leads, l: "Total leads", link: { pathname: "/(tabs)/leads", params: { status: "All" } } },
                { v: k.converted, l: `Converted · ${k.conversion}%`, link: { pathname: "/(tabs)/leads", params: { status: "Converted" } } },
                { v: k.pendingVisits, l: "Pending visits", link: { pathname: "/(tabs)/visits", params: { status: "In Progress" } } },
                { v: k.visits, l: `Visits · ${k.attendance}% attended`, link: { pathname: "/(tabs)/visits", params: { status: "All" } } },
                { v: k.availabilityPending, l: "Pending availability", link: { pathname: "/availability", params: { status: "Pending" } } },
              ].map((x) => (
                <Pressable key={x.l} onPress={() => go(x.link)} style={({ pressed }) => [styles.kpi, pressed && { opacity: 0.85 }]} testID={`mis-kpi-${x.l.split(" ")[0].toLowerCase()}`}>
                  <Text style={styles.kpiValue}>{x.v}</Text>
                  <Text style={styles.kpiLabel}>{x.l.toUpperCase()}</Text>
                </Pressable>
              ))}
            </View>

            {groups.map((g) => (
              <View key={g}>
                <SectionLabel style={{ marginTop: spacing.xl }}>{g}</SectionLabel>
                <View style={{ gap: 12 }}>
                  {reports.filter((r) => r.group === g).map((r) => (
                    <Card key={r.key} testID={`mis-report-${r.key}`}>
                      <Text style={[s.name, { marginBottom: spacing.md }]}>{r.title}</Text>
                      <Bars rows={r.rows(d)} onPress={go} />
                    </Card>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
      <BottomNav />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  download: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 40, paddingHorizontal: 12, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.brandSecondary },
  downloadText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.brandSecondary },
  kpis: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  kpi: { width: "47%", flexGrow: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.border },
  kpiValue: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, color: colors.brandPrimary },
  kpiLabel: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1, color: colors.muted, marginTop: 4 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceTertiary, marginTop: 6, overflow: "hidden" },
  fill: { height: 8, borderRadius: 4 },
}));
