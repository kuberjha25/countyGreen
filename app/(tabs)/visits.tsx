import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { get } from "@/src/api";
import { Badge, Button, ChipRow, EmptyState, ErrorState, FAB, Header, Loading, SearchBar, useScreenStyles } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const TABS = ["All", "Attended", "In Progress"] as const;

// Screen 16 · Project Visits
export default function Visits() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [q, setQ] = useState("");
  const visits = useQuery({ queryKey: ["visits"], queryFn: () => get<any[]>("/visits") });
  const counts = useMemo(() => {
    const c: Record<string, number> = { All: visits.data?.length ?? 0 };
    (visits.data ?? []).forEach((v) => (c[v.status] = (c[v.status] ?? 0) + 1));
    return c;
  }, [visits.data]);
  const list = (visits.data ?? []).filter((v) => (tab === "All" || v.status === tab) && (!q || v.full_name.toLowerCase().includes(q.toLowerCase()) || v.mobile.includes(q)));

  return (
    <View style={s.screen} testID="visits-screen">
      <Header showBack={false} right={<Pressable onPress={() => router.push("/visits/new")} style={styles.addBtn} testID="visits-add-button"><Ionicons name="add" size={22} color={colors.onBrandSecondary} /></Pressable>} />
      <View style={s.content}>
        <Text style={[s.h2, { fontSize: 30 }]}>Project Visits</Text>
        <Text style={[s.bodyMuted, { marginBottom: spacing.md }]}>Track scheduled and attended site visits at County Green.</Text>
        <SearchBar value={q} onChange={setQ} placeholder="Search by name or phone" testID="visits-search" />
      </View>
      <ChipRow options={[...TABS]} value={tab} onChange={setTab} counts={counts} testIDPrefix="visits-tab" />
      {visits.isLoading ? <Loading /> : visits.isError ? <ErrorState message={(visits.error as Error).message} onRetry={visits.refetch} /> : (
        <FlatList
          data={list}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100, gap: 10 }}
          refreshControl={<RefreshControl refreshing={visits.isRefetching} onRefresh={visits.refetch} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={<EmptyState icon="calendar-outline" title="No visits scheduled" body="Schedule a project visit for your client to see it here." action={<Button label="Schedule visit" small onPress={() => router.push("/visits/new")} testID="visits-empty-add" />} />}
          renderItem={({ item: v }) => {
            const [day, mon] = (v.visit_date ?? "").split(" ");
            return (
              <Pressable onPress={() => router.push(`/visits/${v.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} testID={`visit-card-${v.id}`}>
                <View style={[styles.date, v.status === "Attended" && { backgroundColor: colors.forestSoft }]}>
                  <Text style={[styles.day, v.status === "Attended" && { color: colors.brandPrimary }]}>{day}</Text>
                  <Text style={[styles.mon, v.status === "Attended" && { color: colors.brandPrimary }]}>{(mon ?? "").toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{v.full_name}</Text>
                  <Text style={s.meta}>{v.project} · {v.visitor_type}</Text>
                  <View style={[s.between, { marginTop: 8 }]}>
                    <View style={s.row}><Ionicons name="time-outline" size={13} color={colors.muted} /><Text style={[s.caption, { marginLeft: 4 }]}>{v.visit_time}</Text></View>
                    <Badge label={v.status} small />
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
      <FAB onPress={() => router.push("/visits/new")} testID="visits-fab" />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", gap: 14, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14 },
  date: { width: 56, height: 60, borderRadius: radius.md, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" },
  day: { fontFamily: fonts.display, fontSize: 26, lineHeight: 28, color: colors.warning },
  mon: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1, color: colors.warning },
}));
