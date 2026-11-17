import Ionicons from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { activeFilterCount, Badge, BottomNav, ChipRow, EmptyState, ErrorState, FAB, FilterSheet, FilterValues, Header, Loading, useScreenStyles } from "@/src/components/ui";
import { fmtUtc } from "@/src/format";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchRequests } from "@/src/store/requestsSlice";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { label, REQUEST_PRIORITY_LABEL, REQUEST_STATUS_LABEL, REQUEST_STATUSES } from "@/src/types";

const ALL = "All";
const TABS = [ALL, ...REQUEST_STATUSES.map((st) => REQUEST_STATUS_LABEL[st])];
const STATUS_TONE: Record<string, "warning" | "info" | "success" | "error"> = { pending: "warning", in_progress: "info", completed: "success", rejected: "error" };

// My Requests (GET /api/partner-requests — status, priority, page): document requests and other
// queries raised to the County Green team, each with a turnaround time (TAT).
export default function Requests() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const list = useAppSelector((st) => st.requests.list);
  const [tab, setTab] = useState(ALL);
  const [filters, setFilters] = useState<FilterValues>({});
  const [showFilters, setShowFilters] = useState(false);
  const status = REQUEST_STATUSES.find((st) => REQUEST_STATUS_LABEL[st] === tab);
  const priority = Object.keys(REQUEST_PRIORITY_LABEL).find((k) => REQUEST_PRIORITY_LABEL[k] === filters.priority);

  const load = useCallback((page = 1) => dispatch(fetchRequests({ params: { status, priority }, page })), [dispatch, status, priority]);
  useEffect(() => {
    load(1);
  }, [load]);
  useEffect(() => {
    if (list.status === "idle" && list.page > 0) load(1);
  }, [list.status, list.page, load]);
  const more = list.page < list.lastPage;

  return (
    <View style={s.screen} testID="requests-screen">
      <Header
        title="My Requests"
        right={
          <Pressable onPress={() => setShowFilters(true)} hitSlop={8} testID="requests-filter-button">
            <Ionicons name={activeFilterCount(filters) ? "funnel" : "funnel-outline"} size={20} color={colors.brandPrimary} />
          </Pressable>
        }
      />
      <ChipRow options={TABS} value={tab} onChange={setTab} testIDPrefix="requests-tab" />
      <View style={{ flex: 1 }}>
        {list.status === "loading" && !list.items.length ? <Loading /> : list.status === "failed" && !list.items.length ? <ErrorState message={list.error ?? "Could not load requests"} onRetry={() => load(1)} /> : (
          <FlatList
            data={list.items}
            keyExtractor={(r) => String(r.id)}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: 120, gap: 10 }}
            refreshControl={<RefreshControl refreshing={list.status === "loading" && !!list.items.length} onRefresh={() => load(1)} tintColor={colors.brandPrimary} />}
            onEndReachedThreshold={0.4}
            onEndReached={() => more && !list.loadingMore && load(list.page + 1)}
            ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 8 }} /> : null}
            ListEmptyComponent={<EmptyState icon="document-attach-outline" title="No requests" body={status || priority ? "Try another status or priority." : "Tap + to request documents or raise a query."} />}
            renderItem={({ item: r }) => (
              <Pressable onPress={() => router.push(`/requests/${r.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]} testID={`request-card-${r.id}`}>
                <View style={s.between}>
                  <Text style={s.caption}>{r.reference_id}</Text>
                  <Badge label={label(REQUEST_STATUS_LABEL, r.status)} tone={STATUS_TONE[r.status]} small />
                </View>
                <Text style={[s.name, { marginTop: 4 }]}>{r.type}</Text>
                <Text style={s.meta}>{[r.inventory && `Unit ${r.inventory}`, `Raised ${fmtUtc(r.created_at)}`].filter(Boolean).join(" · ")}</Text>
                <View style={[s.row, { gap: 6, marginTop: 8, flexWrap: "wrap" }]}>
                  <Badge label={`${label(REQUEST_PRIORITY_LABEL, r.priority)} priority`} tone="muted" small />
                  {r.is_overdue ? <Badge label="Overdue" tone="error" small /> : r.tat_deadline && r.status !== "completed" && r.status !== "rejected" ? <Text style={s.caption}>Due {fmtUtc(r.tat_deadline)}</Text> : null}
                </View>
              </Pressable>
            )}
          />
        )}
      </View>
      <FAB onPress={() => router.push("/requests/new")} testID="requests-add-button" />
      <FilterSheet visible={showFilters} onClose={() => setShowFilters(false)} groups={[{ key: "priority", label: "Priority", options: Object.values(REQUEST_PRIORITY_LABEL) }]} value={filters} onApply={setFilters} />
      <BottomNav />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
}));
