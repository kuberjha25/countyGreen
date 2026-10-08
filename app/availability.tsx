import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";

import { get } from "@/src/api";
import { PARTNER_TYPES, partnerShort } from "@/src/brand";
import { activeFilterCount, Badge, BottomNav, EmptyState, ErrorState, FILTER_ALL, FilterSheet, FilterValues, Header, Loading, SearchBar, useScreenStyles } from "@/src/components/ui";
import { fmtDate } from "@/src/format";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

// Availability requests raised from Our Products — shown with the assigned staff member
// and the CP / Freelancer / Influencer who requested it.
export default function Availability() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<FilterValues>({});
  const [showFilters, setShowFilters] = useState(false);
  const data = useQuery({ queryKey: ["availability"], queryFn: () => get<any[]>("/availability") });

  const groups = useMemo(() => {
    const list = data.data ?? [];
    const uniq = (k: string) => [...new Set(list.map((r) => r[k]).filter(Boolean))].sort() as string[];
    return [
      { key: "product_name", label: "Product", options: uniq("product_name") },
      { key: "partner_type", label: "Partner type", options: PARTNER_TYPES.map((p) => p.key) },
      { key: "partner_name", label: "CP / Freelancer / Influencer", options: uniq("partner_name") },
      { key: "assigned_to", label: "Assigned staff", options: uniq("assigned_to") },
    ];
  }, [data.data]);
  const on = (k: string) => filters[k] && filters[k] !== FILTER_ALL;
  const list = (data.data ?? []).filter((r) => (!q || `${r.product_name} ${r.partner_name}`.toLowerCase().includes(q.toLowerCase())) && groups.every((g) => !on(g.key) || r[g.key] === filters[g.key]));

  return (
    <View style={s.screen} testID="availability-screen">
      <Header title="Availability Requests" />
      <View style={s.content}>
        <Text style={[s.h2, { fontSize: 30 }]}>Availability Requests</Text>
        <Text style={[s.bodyMuted, { marginBottom: spacing.md }]}>Requests from Our Products with the partner and the assigned staff member.</Text>
        <SearchBar value={q} onChange={setQ} placeholder="Search product or partner" testID="availability-search" onFilter={() => setShowFilters(true)} filterCount={activeFilterCount(filters)} />
      </View>
      {data.isLoading ? <Loading /> : data.isError ? <ErrorState message={(data.error as Error).message} onRetry={data.refetch} /> : (
        <FlatList
          data={list}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 32, gap: 10 }}
          refreshControl={<RefreshControl refreshing={data.isRefetching} onRefresh={data.refetch} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={<EmptyState icon="hourglass-outline" title="No requests" body="Requests raised from Our Products will appear here." />}
          renderItem={({ item: r }) => (
            <View style={styles.card} testID={`availability-card-${r.id}`}>
              <View style={s.between}>
                <Text style={[s.name, { flex: 1 }]} numberOfLines={1}>{r.product_name}</Text>
                <Text style={s.caption}>{fmtDate(r.created_at)}</Text>
              </View>
              <View style={[s.row, { gap: 6, marginTop: 6, flexWrap: "wrap" }]}>
                {r.partner_type ? <Badge label={partnerShort(r.partner_type)} tone="gold" small /> : null}
                <Text style={[s.caption, { flexShrink: 1 }]} numberOfLines={1}>{r.partner_name || "—"}{r.partner_mobile ? ` · ${r.partner_mobile}` : ""}</Text>
              </View>
              <View style={[s.row, { marginTop: 8 }]}>
                <Ionicons name="person-circle-outline" size={13} color={colors.muted} />
                <Text style={[s.caption, { marginLeft: 4 }]} testID={`availability-staff-${r.id}`}>Assigned staff: {r.assigned_to}</Text>
              </View>
            </View>
          )}
        />
      )}
      <FilterSheet visible={showFilters} onClose={() => setShowFilters(false)} groups={groups} value={filters} onApply={setFilters} />
      <BottomNav active="products" />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14 },
}));
