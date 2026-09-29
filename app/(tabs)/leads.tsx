import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { get } from "@/src/api";
import { Avatar, Badge, Button, ChipRow, EmptyState, ErrorState, FAB, Header, Loading, SearchBar, useScreenStyles } from "@/src/components/ui";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

const TABS = ["All", "In Progress", "Converted", "Not Matured"] as const;

// Screen 12 · Leads
export default function Leads() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const [q, setQ] = useState("");
  const leads = useQuery({ queryKey: ["leads"], queryFn: () => get<any[]>("/leads") });

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: leads.data?.length ?? 0 };
    (leads.data ?? []).forEach((l) => (c[l.status] = (c[l.status] ?? 0) + 1));
    return c;
  }, [leads.data]);

  const filtered = (leads.data ?? []).filter((l) => (tab === "All" || l.status === tab) && (!q || l.full_name.toLowerCase().includes(q.toLowerCase()) || l.mobile.includes(q)));

  return (
    <View style={s.screen} testID="leads-screen">
      <Header showBack={false} right={<Pressable onPress={() => router.push("/leads/new")} style={styles.addBtn} testID="leads-add-button"><Ionicons name="add" size={22} color={colors.onBrandSecondary} /></Pressable>} />
      <View style={s.content}>
        <Text style={[s.h2, { fontSize: 30 }]}>Leads</Text>
        <Text style={[s.bodyMuted, { marginBottom: spacing.md }]}>Manage and follow up with your leads.</Text>
        <SearchBar value={q} onChange={setQ} placeholder="Search by name or phone" testID="leads-search" />
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
          ListHeaderComponent={<Text style={[s.caption, { marginBottom: 6 }]}>{filtered.length} lead{filtered.length === 1 ? "" : "s"} · Sorted by latest activity</Text>}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No leads in this stage yet" body="Leads you add will appear here with their status and follow-up." action={<Button label="Add new lead" small onPress={() => router.push("/leads/new")} testID="leads-empty-add" />} />}
          renderItem={({ item: l }) => (
            <Pressable onPress={() => router.push(`/leads/${l.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} testID={`lead-card-${l.id}`}>
              <Avatar name={l.full_name} />
              <View style={{ flex: 1 }}>
                <View style={s.between}>
                  <Text style={s.name} numberOfLines={1}>{l.full_name}</Text>
                  <Badge label={l.temperature} small />
                </View>
                <Text style={s.meta}>{l.project} · {l.configuration || "Config TBD"}</Text>
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
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14 },
}));
