import Ionicons from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { isStaff } from "@/src/access";
import { useAuth, useCan } from "@/src/auth";
import { activeFilterCount, Badge, Button, ChipRow, EmptyState, ErrorState, FAB, FILTER_ALL, FilterSheet, FilterValues, Header, Loading, SearchBar, useScreenStyles } from "@/src/components/ui";
import { parseDate } from "@/src/format";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchVisits } from "@/src/store/visitsSlice";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { DATE_FILTERS, label, VISIT_STATUS_LABEL, VISIT_STATUSES } from "@/src/types";

const ALL = "All";
const TABS = [ALL, ...VISIT_STATUSES.map((s) => VISIT_STATUS_LABEL[s])];
const statusFromTab = (t: string) => VISIT_STATUSES.find((s) => VISIT_STATUS_LABEL[s] === t);
const tabFromParam = (p?: string) => (p && VISIT_STATUS_LABEL[p] ? VISIT_STATUS_LABEL[p] : ALL);
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Screen 16 · Project Visits (GET /api/visits) — partners: view-only status; staff: schedule & update.
export default function Visits() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const can = useCan();
  const staffView = isStaff(user);
  const params = useLocalSearchParams<{ status?: string }>();
  const list = useAppSelector((st) => st.visits.list);
  const [tab, setTab] = useState(() => tabFromParam(params.status));
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterValues>({});
  const [showFilters, setShowFilters] = useState(false);

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
    date_filter: on("date") ? Object.keys(DATE_FILTERS).find((k) => DATE_FILTERS[k as keyof typeof DATE_FILTERS] === filters.date) : undefined,
  };
  const key = JSON.stringify(query);
  const load = useCallback((page = 1) => dispatch(fetchVisits({ params: JSON.parse(key), page })), [dispatch, key]);
  useEffect(() => {
    load(1);
  }, [load]);
  useEffect(() => {
    if (list.status === "idle" && list.page > 0) load(1);
  }, [list.status, list.page, load]);

  const groups = [{ key: "date", label: "Visit date", options: Object.values(DATE_FILTERS) }];
  const filterCount = activeFilterCount(filters);
  const more = list.page < list.lastPage;

  return (
    <View style={s.screen} testID="visits-screen">
      <Header showBack={false} right={can("visits", "add") ? <Pressable onPress={() => router.push("/visits/new")} style={styles.addBtn} testID="visits-add-button"><Ionicons name="add" size={22} color={colors.onBrandSecondary} /></Pressable> : undefined} />
      <View style={s.content}>
        <Text style={[s.h2, { fontSize: 30 }]}>Project Visits</Text>
        <Text style={[s.bodyMuted, { marginBottom: spacing.md }]}>{staffView ? "Schedule site visits and mark them attended." : "Status of the County Green site visits for your customers. View only."}</Text>
        <SearchBar value={q} onChange={setQ} placeholder="Search visitor name or mobile" testID="visits-search" onFilter={() => setShowFilters(true)} filterCount={filterCount} />
      </View>
      <ChipRow options={TABS} value={tab} onChange={setTab} testIDPrefix="visits-tab" />
      {list.status === "loading" && !list.items.length ? (
        <Loading />
      ) : list.status === "failed" && !list.items.length ? (
        <ErrorState message={list.error ?? "Could not load visits"} onRetry={() => load(1)} />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(v) => String(v.id)}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 100, gap: 10 }}
          refreshControl={<RefreshControl refreshing={list.status === "loading" && !!list.items.length} onRefresh={() => load(1)} tintColor={colors.brandPrimary} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => more && !list.loadingMore && load(list.page + 1)}
          ListHeaderComponent={
            <View style={[s.between, { marginBottom: 4 }]}>
              <Text style={s.caption}>{list.total} visit{list.total === 1 ? "" : "s"}</Text>
              {filterCount ? <Pressable onPress={() => setFilters({})} hitSlop={8} testID="visits-clear-filters"><Text style={s.link}>Clear filters</Text></Pressable> : null}
            </View>
          }
          ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 8 }} /> : null}
          ListEmptyComponent={
            can("visits", "add") ? (
              <EmptyState icon="calendar-outline" title="No visits" body="Schedule a project visit for a customer to see it here." action={<Button label="Schedule visit" small onPress={() => router.push("/visits/new")} testID="visits-empty-add" />} />
            ) : (
              <EmptyState icon="calendar-outline" title="No visits yet" body="Project visits booked for your customers by the County Green team appear here." />
            )
          }
          renderItem={({ item: v }) => {
            const d = parseDate(v.visit_date);
            const done = v.status === "completed";
            return (
              <Pressable onPress={() => router.push(`/visits/${v.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} testID={`visit-card-${v.id}`}>
                <View style={[styles.date, done && { backgroundColor: colors.forestSoft }]}>
                  <Text style={[styles.day, done && { color: colors.brandPrimary }]}>{d ? String(d.getDate()).padStart(2, "0") : "—"}</Text>
                  <Text style={[styles.mon, done && { color: colors.brandPrimary }]}>{d ? MON[d.getMonth()] : ""}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{v.visitor_name}</Text>
                  <Text style={s.meta} numberOfLines={1}>{v.project_name ?? "—"}</Text>
                  <View style={[s.between, { marginTop: 8 }]}>
                    <View style={s.row}><Ionicons name="time-outline" size={13} color={colors.muted} /><Text style={[s.caption, { marginLeft: 4 }]}>{[v.visit_time, v.visit_end_time].filter(Boolean).join(" – ")}</Text></View>
                    <Badge label={label(VISIT_STATUS_LABEL, v.status)} small />
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
