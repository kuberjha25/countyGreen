import Ionicons from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { useCan } from "@/src/auth";
import { PARTNER_TYPES, partnerTypeName } from "@/src/brand";
import { Avatar, Badge, BottomNav, Button, ChipRow, EmptyState, ErrorState, FAB, Header, Loading, SearchBar, Segmented, useScreenStyles } from "@/src/components/ui";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchRegistrations } from "@/src/store/registrationsSlice";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const STATUS = ["pending", "completed"] as const;
const ALL = "All";

// Screen 9 · Registrations (GET /api/registrations — status pending | completed, search, page).
// The API has no partner-type filter, so the type chips filter the loaded rows.
export default function Registrations() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const can = useCan();
  const params = useLocalSearchParams<{ status?: string }>();
  const list = useAppSelector((st) => st.registrations.list);
  const [status, setStatus] = useState<(typeof STATUS)[number]>(params.status === "completed" ? "completed" : "pending");
  const [type, setType] = useState(ALL);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearch(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);
  const load = useCallback((page = 1) => dispatch(fetchRegistrations({ params: { status, search: search || undefined }, page })), [dispatch, status, search]);
  useEffect(() => {
    load(1);
  }, [load]);
  useEffect(() => {
    if (list.status === "idle" && list.page > 0) load(1);
  }, [list.status, list.page, load]);

  const items = list.items.filter((r) => type === ALL || partnerTypeName(r.partner_type) === type);
  const more = list.page < list.lastPage;

  return (
    <View style={s.screen} testID="registrations-screen">
      <Header title="Registrations" right={can("registrations", "add") ? <Pressable onPress={() => router.push("/registrations/new")} style={styles.addBtn} testID="registrations-add-button"><Ionicons name="add" size={22} color={colors.onBrandSecondary} /></Pressable> : undefined} />
      <View style={[s.content, { paddingBottom: spacing.sm }]}>
        <Text style={[s.h2, { fontSize: 30, marginBottom: spacing.md }]}>Registrations</Text>
        <View style={{ marginBottom: spacing.md }}><Segmented options={STATUS} labels={{ pending: "Pending", completed: "Completed" }} value={status} onChange={setStatus} testIDPrefix="registrations-segment" /></View>
        <SearchBar value={q} onChange={setQ} placeholder="Search name, mobile or email" testID="registrations-search" />
      </View>
      <ChipRow options={[ALL, ...PARTNER_TYPES.map((p) => p.key)]} value={type} onChange={setType} testIDPrefix="reg-cat" />
      <View style={{ flex: 1 }}>
        {list.status === "loading" && !list.items.length ? <Loading /> : list.status === "failed" && !list.items.length ? <ErrorState message={list.error ?? "Could not load registrations"} onRetry={() => load(1)} /> : (
          <FlatList
            data={items}
            keyExtractor={(r) => String(r.id)}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: 100, gap: 10 }}
            refreshControl={<RefreshControl refreshing={list.status === "loading" && !!list.items.length} onRefresh={() => load(1)} tintColor={colors.brandPrimary} />}
            onEndReachedThreshold={0.4}
            onEndReached={() => more && !list.loadingMore && load(list.page + 1)}
            ListHeaderComponent={<Text style={[s.caption, { marginBottom: 4 }]}>{type === ALL ? `${list.total} ${status}` : `${items.length} shown`}</Text>}
            ListFooterComponent={list.loadingMore ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 8 }} /> : null}
            ListEmptyComponent={<EmptyState icon="person-add-outline" title={`No ${status} registrations`} body="Registered partners appear here." action={can("registrations", "add") ? <Button label="New registration" small onPress={() => router.push("/registrations/new")} testID="registrations-empty-add" /> : undefined} />}
            renderItem={({ item: r }) => (
              <Pressable onPress={() => router.push(`/registrations/${r.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]} testID={`registration-card-${r.id}`}>
                <Avatar name={r.name} tone="gold" />
                <View style={{ flex: 1 }}>
                  <View style={s.between}>
                    <Text style={[s.name, { flex: 1 }]} numberOfLines={1}>{r.name}</Text>
                    <Text style={s.caption}>{r.registered_date}</Text>
                  </View>
                  <Text style={s.meta}>{[r.mobile, r.email].filter(Boolean).join(" · ")}</Text>
                  <View style={[s.between, { marginTop: 8 }]}>
                    <Badge label={partnerTypeName(r.partner_type)} tone="gold" small />
                    <View style={s.row}><Text style={s.link}>View</Text><Ionicons name="chevron-forward" size={14} color={colors.brandPrimary} /></View>
                  </View>
                </View>
              </Pressable>
            )}
          />
        )}
        {can("registrations", "add") ? <FAB onPress={() => router.push("/registrations/new")} testID="registrations-fab" /> : null}
      </View>
      <BottomNav />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, shadowColor: colors.forestDeep, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
}));
