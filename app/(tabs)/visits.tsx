import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { get } from "@/src/api";
import { isStaff } from "@/src/access";
import { useAuth, useCan } from "@/src/auth";
import { PARTNER_TYPES, partnerShort } from "@/src/brand";
import { activeFilterCount, Badge, Button, ChipRow, EmptyState, ErrorState, FAB, FILTER_ALL, FilterSheet, FilterValues, Header, Loading, SearchBar, useScreenStyles } from "@/src/components/ui";
import { contactOf, parseDate, startOfDay } from "@/src/format";
import { useLookups } from "@/src/lookups";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const TABS = ["All", "In Progress", "Attended"] as const;
const WHEN = ["Today", "Upcoming", "Past 7 days", "Past 30 days"];
const FILTER_KEYS = ["when", "visit_time", "partner_type", "partner_name", "assigned_to", "project"];
const DAY = 86400000;

const tabFrom = (p: Record<string, string>) => (p.status && TABS.includes(p.status as any) ? p.status : "All");
const filtersFrom = (p: Record<string, string>): FilterValues => Object.fromEntries(FILTER_KEYS.filter((k) => p[k]).map((k) => [k, p[k]]));

function matchesWhen(date: string | undefined, f: string) {
  const d = parseDate(date);
  if (!d) return false;
  const day = startOfDay(d).getTime();
  const today = startOfDay(new Date()).getTime();
  if (f === "Today") return day === today;
  if (f === "Upcoming") return day >= today;
  return day < today && day >= today - (f === "Past 7 days" ? 7 : 30) * DAY;
}

// Screen 16 · Project Visits — partners: view-only status of their visits; staff: schedule & update.
export default function Visits() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const lookups = useLookups();
  const { user } = useAuth();
  const can = useCan();
  const staffView = isStaff(user);
  const params = useLocalSearchParams<Record<string, string>>();
  const [tab, setTab] = useState<string>(() => tabFrom(params));
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<FilterValues>(() => filtersFrom(params));
  const [showFilters, setShowFilters] = useState(false);
  const visits = useQuery({ queryKey: ["visits"], queryFn: () => get<any[]>("/visits") });

  // Dashboard / MIS links open this tab with ?status=…&assigned_to=… etc.
  const paramKey = JSON.stringify(params);
  const [seenParams, setSeenParams] = useState(paramKey);
  if (seenParams !== paramKey) {
    setSeenParams(paramKey);
    if (params.status) {
      setTab(tabFrom(params));
      setFilters(filtersFrom(params));
    }
  }

  const uniq = (k: string) => [...new Set((visits.data ?? []).map((v) => v[k]).filter(Boolean))].sort() as string[];
  const groups = [
    { key: "when", label: "Visit date", options: WHEN },
    { key: "visit_time", label: "Time slot", options: [...new Set([...lookups.time_slots, ...uniq("visit_time")])] },
    { key: "project", label: "Project", options: uniq("project") },
    ...(staffView
      ? [
          { key: "partner_type", label: "Visit for (partner type)", options: [...PARTNER_TYPES.map((p) => p.key), "Direct"] },
          { key: "partner_name", label: "CP / Freelancer / Influencer", options: uniq("partner_name") },
          { key: "assigned_to", label: "Assigned staff", options: uniq("assigned_to") },
        ]
      : []),
  ];
  const on = (k: string) => filters[k] && filters[k] !== FILTER_ALL;
  const base = (visits.data ?? []).filter(
    (v) =>
      (!q || v.full_name.toLowerCase().includes(q.toLowerCase()) || (v.mobile ?? "").replace(/\s/g, "").includes(q.replace(/\s/g, "")) || (q.length >= 3 && (v.mobile_last4 ?? "").includes(q))) &&
      (!on("when") || matchesWhen(v.visit_date, filters.when)) &&
      (!on("partner_type") || (filters.partner_type === "Direct" ? !v.partner_type : v.partner_type === filters.partner_type)) &&
      ["visit_time", "partner_name", "assigned_to", "project"].every((k) => !on(k) || v[k] === filters[k]),
  );
  const counts: Record<string, number> = { All: base.length };
  base.forEach((v) => (counts[v.status] = (counts[v.status] ?? 0) + 1));
  const list = base.filter((v) => tab === "All" || v.status === tab);
  const filterCount = activeFilterCount(filters);

  return (
    <View style={s.screen} testID="visits-screen">
      <Header showBack={false} right={can("visits", "add") ? <Pressable onPress={() => router.push("/visits/new")} style={styles.addBtn} testID="visits-add-button"><Ionicons name="add" size={22} color={colors.onBrandSecondary} /></Pressable> : undefined} />
      <View style={s.content}>
        <Text style={[s.h2, { fontSize: 30 }]}>Project Visits</Text>
        <Text style={[s.bodyMuted, { marginBottom: spacing.md }]}>{staffView ? "Schedule visits for partners' customers and update their status." : "Status of the County Green site visits booked for your customers. View only."}</Text>
        <SearchBar value={q} onChange={setQ} placeholder="Search name, phone or last 4 digits" testID="visits-search" onFilter={() => setShowFilters(true)} filterCount={filterCount} />
      </View>
      <ChipRow options={[...TABS]} value={tab as (typeof TABS)[number]} onChange={setTab} counts={counts} testIDPrefix="visits-tab" />
      {visits.isLoading ? <Loading /> : visits.isError ? <ErrorState message={(visits.error as Error).message} onRetry={visits.refetch} /> : (
        <FlatList
          data={list}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100, gap: 10 }}
          refreshControl={<RefreshControl refreshing={visits.isRefetching} onRefresh={visits.refetch} tintColor={colors.brandPrimary} />}
          ListHeaderComponent={filterCount ? (
            <View style={[s.between, { marginBottom: 4 }]}>
              <Text style={s.caption}>{list.length} visit{list.length === 1 ? "" : "s"}</Text>
              <Pressable onPress={() => setFilters({})} hitSlop={8} testID="visits-clear-filters"><Text style={s.link}>Clear filters</Text></Pressable>
            </View>
          ) : null}
          ListEmptyComponent={
            can("visits", "add") ? (
              <EmptyState icon="calendar-outline" title="No visits scheduled" body="Schedule a project visit for a customer to see it here." action={<Button label="Schedule visit" small onPress={() => router.push("/visits/new")} testID="visits-empty-add" />} />
            ) : (
              <EmptyState icon="calendar-outline" title="No visits yet" body="Project visits booked for your customers by the County Green team appear here." />
            )
          }
          renderItem={({ item: v }) => {
            const [day, mon] = (v.visit_date ?? "").split(" ");
            const done = v.status === "Attended";
            return (
              <Pressable onPress={() => router.push(`/visits/${v.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} testID={`visit-card-${v.id}`}>
                <View style={[styles.date, done && { backgroundColor: colors.forestSoft }]}>
                  <Text style={[styles.day, done && { color: colors.brandPrimary }]}>{day}</Text>
                  <Text style={[styles.mon, done && { color: colors.brandPrimary }]}>{(mon ?? "").toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{v.full_name}</Text>
                  <Text style={s.meta} numberOfLines={1}>{contactOf(v) || "—"} · {v.project}</Text>
                  <View style={[s.row, { gap: 6, marginTop: 4, flexWrap: "wrap" }]}>
                    {v.partner_type ? <Badge label={partnerShort(v.partner_type)} tone="gold" small /> : <Badge label="Direct" small />}
                    {v.assigned_to ? <Text style={[s.caption, { flexShrink: 1 }]} numberOfLines={1}>Staff: {v.assigned_to}</Text> : null}
                  </View>
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
      {can("visits", "add") ? <FAB onPress={() => router.push("/visits/new")} testID="visits-fab" /> : null}
      <FilterSheet visible={showFilters} onClose={() => setShowFilters(false)} groups={groups} value={filters} onApply={setFilters} />
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
