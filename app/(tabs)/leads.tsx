import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { get } from "@/src/api";
import { PARTNER_TYPES, partnerShort } from "@/src/brand";
import { activeFilterCount, Avatar, Badge, Button, ChipRow, EmptyState, ErrorState, FAB, FILTER_ALL, FilterSheet, FilterValues, Header, Loading, SearchBar, useScreenStyles } from "@/src/components/ui";
import { parseDate, startOfDay } from "@/src/format";
import { useLookups } from "@/src/lookups";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const TABS = ["All", "In Progress", "Converted", "Not Matured"] as const;
const ADDED = ["Today", "Last 7 days", "Last 30 days", "Last 90 days"];
const FOLLOW_UP = ["Overdue", "Today", "Next 7 days"];
const DAY = 86400000;

function matchesAdded(created: string | undefined, f: string) {
  const d = parseDate(created);
  if (!d) return false;
  const today = startOfDay(new Date()).getTime();
  const days = { Today: 0, "Last 7 days": 6, "Last 30 days": 29, "Last 90 days": 89 }[f] ?? 0;
  return d.getTime() >= today - days * DAY;
}

function matchesFollowUp(date: string | undefined, f: string) {
  const d = parseDate(date);
  if (!d) return false;
  const day = startOfDay(d).getTime();
  const today = startOfDay(new Date()).getTime();
  if (f === "Overdue") return day < today;
  if (f === "Today") return day === today;
  return day >= today && day <= today + 7 * DAY;
}

// Screen 12 · Leads
export default function Leads() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const lookups = useLookups();
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<FilterValues>({});
  const [showFilters, setShowFilters] = useState(false);
  const leads = useQuery({ queryKey: ["leads"], queryFn: () => get<any[]>("/leads") });

  const staff = useMemo(() => [...new Set((leads.data ?? []).map((l) => l.assigned_to).filter(Boolean))].sort() as string[], [leads.data]);
  const groups = [
    { key: "added", label: "Date added", options: ADDED },
    { key: "follow_up", label: "Follow-up date", options: FOLLOW_UP },
    { key: "category", label: "Customer category", options: lookups.customer_categories },
    { key: "partner_type", label: "Lead by (partner type)", options: PARTNER_TYPES.map((p) => p.key) },
    { key: "temperature", label: "Temperature", options: ["Hot", "Warm", "Cold"] },
    ...(staff.length ? [{ key: "assigned_to", label: "Assigned staff", options: staff }] : []),
  ];
  const on = (k: string) => filters[k] && filters[k] !== FILTER_ALL;

  // Search + filters first; the status chips then count within that result.
  const base = (leads.data ?? []).filter(
    (l) =>
      (!q || l.full_name.toLowerCase().includes(q.toLowerCase()) || l.mobile.includes(q)) &&
      (!on("added") || matchesAdded(l.created_at, filters.added)) &&
      (!on("follow_up") || matchesFollowUp(l.follow_up_date, filters.follow_up)) &&
      (!on("category") || l.category === filters.category) &&
      (!on("partner_type") || l.partner_type === filters.partner_type) &&
      (!on("temperature") || l.temperature === filters.temperature) &&
      (!on("assigned_to") || l.assigned_to === filters.assigned_to),
  );
  const counts: Record<string, number> = { All: base.length };
  base.forEach((l) => (counts[l.status] = (counts[l.status] ?? 0) + 1));
  const filtered = base.filter((l) => tab === "All" || l.status === tab);
  const filterCount = activeFilterCount(filters);

  return (
    <View style={s.screen} testID="leads-screen">
      <Header showBack={false} right={<Pressable onPress={() => router.push("/leads/new")} style={styles.addBtn} testID="leads-add-button"><Ionicons name="add" size={22} color={colors.onBrandSecondary} /></Pressable>} />
      <View style={s.content}>
        <Text style={[s.h2, { fontSize: 30 }]}>Leads</Text>
        <Text style={[s.bodyMuted, { marginBottom: spacing.md }]}>Manage and follow up with your leads.</Text>
        <SearchBar value={q} onChange={setQ} placeholder="Search by name or phone" testID="leads-search" onFilter={() => setShowFilters(true)} filterCount={filterCount} />
      </View>
      <ChipRow options={[...TABS]} value={tab} onChange={setTab} counts={counts} testIDPrefix="leads-tab" />
      {leads.isLoading ? (
        <Loading />
      ) : leads.isError ? (
        <ErrorState message={(leads.error as Error).message} onRetry={leads.refetch} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: 100, gap: 10 }}
          refreshControl={<RefreshControl refreshing={leads.isRefetching} onRefresh={leads.refetch} tintColor={colors.brandPrimary} />}
          ListHeaderComponent={
            <View style={[s.between, { marginBottom: 6 }]}>
              <Text style={s.caption}>{filtered.length} lead{filtered.length === 1 ? "" : "s"} · Sorted by latest activity</Text>
              {filterCount ? (
                <Pressable onPress={() => setFilters({})} hitSlop={8} testID="leads-clear-filters">
                  <Text style={s.link}>Clear filters</Text>
                </Pressable>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            filterCount || q ? (
              <EmptyState icon="options-outline" title="No leads match" body="Try changing the search or filters." action={<Button label="Clear filters" small variant="secondary" onPress={() => { setFilters({}); setQ(""); }} testID="leads-empty-clear" />} />
            ) : (
              <EmptyState icon="people-outline" title="No leads in this stage yet" body="Leads you add will appear here with their status and follow-up." action={<Button label="Add new lead" small onPress={() => router.push("/leads/new")} testID="leads-empty-add" />} />
            )
          }
          renderItem={({ item: l }) => (
            <Pressable onPress={() => router.push(`/leads/${l.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} testID={`lead-card-${l.id}`}>
              <Avatar name={l.full_name} />
              <View style={{ flex: 1 }}>
                <View style={s.between}>
                  <Text style={[s.name, { flex: 1 }]} numberOfLines={1}>{l.full_name}</Text>
                  <Badge label={l.temperature} small />
                </View>
                <Text style={s.meta}>{l.project} · {l.configuration || "Config TBD"}{l.category ? ` · ${l.category}` : ""}</Text>
                <View style={[s.row, { gap: 6, marginTop: 6, flexWrap: "wrap" }]}>
                  {l.partner_type ? <Badge label={partnerShort(l.partner_type)} tone="gold" small /> : null}
                  <Text style={[s.caption, { flexShrink: 1 }]} numberOfLines={1}>{l.partner_name || "—"}</Text>
                </View>
                <View style={[s.row, { marginTop: 4 }]}>
                  <Ionicons name="person-circle-outline" size={13} color={colors.muted} />
                  <Text style={[s.caption, { marginLeft: 4 }]} numberOfLines={1}>Staff: {l.assigned_to || "Not assigned yet"}</Text>
                </View>
                <View style={[s.between, { marginTop: 8 }]}>
                  <View style={s.row}>
                    <Ionicons name="time-outline" size={13} color={colors.muted} />
                    <Text style={[s.caption, { marginLeft: 4 }]}>Follow-up {l.follow_up_date || "—"}</Text>
                  </View>
                  <Badge label={l.status} small />
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
      <FAB onPress={() => router.push("/leads/new")} testID="leads-fab" />
      <FilterSheet visible={showFilters} onClose={() => setShowFilters(false)} groups={groups} value={filters} onApply={setFilters} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14 },
}));
