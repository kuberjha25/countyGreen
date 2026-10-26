import Ionicons from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { isStaff } from "@/src/access";
import { useAuth, useCan } from "@/src/auth";
import { activeFilterCount, Avatar, Badge, Button, ChipRow, COMING_SOON, EmptyState, ErrorState, FAB, FILTER_ALL, FilterSheet, FilterValues, Header, Loading, SearchBar, useScreenStyles } from "@/src/components/ui";
import { useSources } from "@/src/lookups";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchLeads } from "@/src/store/leadsSlice";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";
import { DATE_FILTERS, label, LEAD_LIST_STATUSES, LEAD_STATUS_LABEL, LEAD_TYPES } from "@/src/types";

const ALL = "All";
const TABS = [ALL, ...LEAD_LIST_STATUSES.map((s) => LEAD_STATUS_LABEL[s])];
const statusFromTab = (t: string) => LEAD_LIST_STATUSES.find((s) => LEAD_STATUS_LABEL[s] === t);
const tabFromParam = (p?: string) => (p && LEAD_STATUS_LABEL[p] ? LEAD_STATUS_LABEL[p] : ALL);
const cap = (v: string) => v[0].toUpperCase() + v.slice(1);

// Screen 12 · Leads (GET /api/leads) — partners: view-only list of their leads; staff: add & follow up.
export default function Leads() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const can = useCan();
  const staffView = isStaff(user);
  const params = useLocalSearchParams<{ status?: string }>();
  const list = useAppSelector((st) => st.leads.list);
  const sources = useSources();
  const [tab, setTab] = useState(() => tabFromParam(params.status));
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterValues>({});
  const [showFilters, setShowFilters] = useState(false);

  // Dashboard tiles open this tab with ?status=…
  const [seenStatus, setSeenStatus] = useState(params.status);
  if (seenStatus !== params.status) {
    setSeenStatus(params.status);
    if (params.status) setTab(tabFromParam(params.status));
  }

  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  const on = (k: string) => !!filters[k] && filters[k] !== FILTER_ALL;
  const query = {
    status: statusFromTab(tab),
    search: search || undefined,
    lead_type: on("lead_type") ? filters.lead_type.toLowerCase() : undefined,
    date_filter: on("date") ? Object.keys(DATE_FILTERS).find((k) => DATE_FILTERS[k as keyof typeof DATE_FILTERS] === filters.date) : undefined,
  };
  const key = JSON.stringify(query);
  const load = useCallback((page = 1) => dispatch(fetchLeads({ params: JSON.parse(key), page })), [dispatch, key]);
  useEffect(() => {
    load(1);
  }, [load]);
  // Refetch after a lead is added or changed (the slice marks the list stale).
  useEffect(() => {
    if (list.status === "idle" && list.page > 0) load(1);
  }, [list.status, list.page, load]);

  const groups = [
    { key: "date", label: "Date added", options: Object.values(DATE_FILTERS) },
    { key: "lead_type", label: "Lead type", options: LEAD_TYPES.map(cap) },
    { key: "source", label: "Lead source", options: (sources.data ?? []).map((o) => o.name) },
  ];
  // The server ignores ?source=, so source is filtered here.
  const items = list.items.filter((l) => !on("source") || l.source === filters.source);
  const filterCount = activeFilterCount(filters);
  const more = list.page < list.lastPage;

  return (
    <View style={s.screen} testID="leads-screen">
      <Header
        showBack={false}
        showBell={!can("leads", "add")}
        right={
          can("leads", "add") ? (
            <View style={[s.row, { gap: 12 }]}>
              <Pressable onPress={() => toast.show(COMING_SOON, "info")} hitSlop={8} testID="leads-reassign-button"><Text style={s.link}>Reassign</Text></Pressable>
              <Pressable onPress={() => router.push("/leads/new")} style={styles.addBtn} testID="leads-add-button"><Ionicons name="add" size={22} color={colors.onBrandSecondary} /></Pressable>
            </View>
          ) : undefined
        }
      />
      <View style={s.content}>
        <Text style={[s.h2, { fontSize: 30 }]}>{staffView ? "Leads" : "My Leads"}</Text>
        <Text style={[s.bodyMuted, { marginBottom: spacing.md }]}>{staffView ? "Add leads for partners and follow them up." : "Leads added for you by the County Green team. View only."}</Text>
        <SearchBar value={q} onChange={setQ} placeholder="Search name, mobile, email or project" testID="leads-search" onFilter={() => setShowFilters(true)} filterCount={filterCount} />
      </View>
      <ChipRow options={TABS} value={tab} onChange={setTab} testIDPrefix="leads-tab" />
      {list.status === "loading" && !list.items.length ? (
        <Loading />
      ) : list.status === "failed" && !list.items.length ? (
        <ErrorState message={list.error ?? "Could not load leads"} onRetry={() => load(1)} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(l) => String(l.id)}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: 100, gap: 10 }}
          refreshControl={<RefreshControl refreshing={list.status === "loading" && !!list.items.length} onRefresh={() => load(1)} tintColor={colors.brandPrimary} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => more && !list.loadingMore && load(list.page + 1)}
          ListHeaderComponent={
            <View style={[s.between, { marginBottom: 6, gap: 10 }]}>
              <Text style={[s.caption, { flex: 1 }]}>{on("source") ? `${items.length} shown` : `${list.total} lead${list.total === 1 ? "" : "s"}`}</Text>
              {filterCount ? (
                <Pressable onPress={() => setFilters({})} hitSlop={8} testID="leads-clear-filters"><Text style={s.link}>Clear filters</Text></Pressable>
              ) : can("leads", "add") ? (
                <Pressable onPress={() => router.push("/leads/bulk")} hitSlop={8} style={s.row} testID="leads-bulk-link">
                  <Ionicons name="cloud-upload-outline" size={14} color={colors.brandPrimary} />
                  <Text style={[s.link, { marginLeft: 4 }]}>Bulk upload</Text>
                </Pressable>
              ) : null}
            </View>
          }
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 8 }} /> : null}
          ListEmptyComponent={
            filterCount || search ? (
              <EmptyState icon="options-outline" title="No leads match" body="Try changing the search or filters." action={<Button label="Clear filters" small variant="secondary" onPress={() => { setFilters({}); setQ(""); }} testID="leads-empty-clear" />} />
            ) : can("leads", "add") ? (
              <EmptyState icon="people-outline" title="No leads here yet" body="Leads you add will appear here with their status." action={<Button label="Add new lead" small onPress={() => router.push("/leads/new")} testID="leads-empty-add" />} />
            ) : (
              <EmptyState icon="people-outline" title="No leads yet" body="When you bring a customer to the County Green office, our team adds the lead for you and it appears here." />
            )
          }
          renderItem={({ item: l }) => (
            <Pressable onPress={() => router.push(`/leads/${l.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} testID={`lead-card-${l.id}`}>
              <Avatar name={l.full_name} />
              <View style={{ flex: 1 }}>
                <View style={s.between}>
                  <Text style={[s.name, { flex: 1 }]} numberOfLines={1}>{l.full_name}</Text>
                  <Badge label={label(LEAD_STATUS_LABEL, l.status)} small />
                </View>
                <Text style={s.meta} numberOfLines={1}>{l.mobile}{l.email ? ` · ${l.email}` : ""}</Text>
                <View style={[s.row, { gap: 6, marginTop: 6, flexWrap: "wrap" }]}>
                  {l.project_name ? <Badge label={l.project_name} tone="gold" small /> : null}
                  {l.source ? <Text style={[s.caption, { flexShrink: 1 }]} numberOfLines={1}>via {l.source}</Text> : null}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
      {can("leads", "add") ? <FAB onPress={() => router.push("/leads/new")} testID="leads-fab" /> : null}
      <FilterSheet visible={showFilters} onClose={() => setShowFilters(false)} groups={groups} value={filters} onApply={setFilters} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14 },
}));
