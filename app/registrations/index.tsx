import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { get } from "@/src/api";
import { useCan } from "@/src/auth";
import { PARTNER_TYPES } from "@/src/brand";
import { Avatar, Badge, BottomNav, Button, EmptyState, ErrorState, FAB, Header, Loading, SearchBar, useScreenStyles } from "@/src/components/ui";
import { fmtDate } from "@/src/format";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const STATUS = ["Pending", "Completed"] as const;

// Screen 9 · Registrations
export default function Registrations() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const oneRow = width >= 380;
  const can = useCan();
  const params = useLocalSearchParams<{ status?: string }>();
  const [status, setStatus] = useState<(typeof STATUS)[number]>(params.status === "Completed" ? "Completed" : "Pending");
  const [cat, setCat] = useState<string>("Channel Partner");
  const [q, setQ] = useState("");
  const regs = useQuery({ queryKey: ["registrations"], queryFn: () => get<any[]>("/registrations") });
  const all = regs.data ?? [];
  const countFor = (c: string) => all.filter((r) => r.category === c).length;
  const list = all.filter((r) => r.status === status && r.category === cat && (!q || `${r.first_name} ${r.last_name}`.toLowerCase().includes(q.toLowerCase()) || r.mobile.includes(q)));

  return (
    <View style={s.screen} testID="registrations-screen">
      <Header title="Registrations" right={can("registrations", "add") ? <Pressable onPress={() => router.push("/registrations/new")} style={styles.addBtn} testID="registrations-add-button"><Ionicons name="add" size={22} color={colors.onBrandSecondary} /></Pressable> : undefined} />
      <View style={[s.content, { paddingBottom: spacing.sm }]}>
        <Text style={[s.h2, { fontSize: 30, marginBottom: spacing.md }]}>Registrations</Text>

        <View style={[styles.catRow, !oneRow && { flexWrap: "wrap" }]}>
          {PARTNER_TYPES.map((p, i) => {
            const sel = cat === p.key;
            return (
              <Animated.View key={p.key} entering={FadeInUp.delay(60 * i).duration(400)} style={[styles.catItem, !oneRow && { width: "47%", flexGrow: 1 }]}>
                <Pressable onPress={() => setCat(p.key)} style={({ pressed }) => [styles.cat, sel && styles.catSel, pressed && { transform: [{ scale: 0.97 }] }]} testID={`reg-cat-${p.key.toLowerCase().replace(/\s+/g, "-")}`}>
                  <View style={[styles.catIcon, sel && { backgroundColor: colors.brandSecondary }]}>
                    <Ionicons name={p.icon as any} size={20} color={sel ? colors.forestDeep : colors.brandPrimary} />
                  </View>
                  <Text style={[styles.catText, sel && { color: colors.onImage }]} numberOfLines={2}>{p.key}</Text>
                  <Text style={[styles.catCount, sel && { color: colors.brandSecondary }]}>{regs.isLoading ? "—" : countFor(p.key)}</Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        <View style={styles.segment}>
          {STATUS.map((st) => (
            <Pressable key={st} onPress={() => setStatus(st)} style={[styles.segBtn, status === st && styles.segSel]} testID={`registrations-segment-${st.toLowerCase()}`}>
              <Text style={[styles.segText, status === st && { color: colors.onBrandSecondary }]}>{st}</Text>
            </Pressable>
          ))}
        </View>
        <SearchBar value={q} onChange={setQ} placeholder="Search by name or phone" testID="registrations-search" />
      </View>
      <View style={{ flex: 1 }}>
      {regs.isLoading ? <Loading /> : regs.isError ? <ErrorState message={(regs.error as Error).message} onRetry={regs.refetch} /> : (
        <FlatList
          data={list}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: 100, gap: 10 }}
          refreshControl={<RefreshControl refreshing={regs.isRefetching} onRefresh={regs.refetch} tintColor={colors.brandPrimary} />}
          ListHeaderComponent={<Text style={[s.caption, { marginBottom: 4 }]}>{list.length} {status.toLowerCase()} · {cat}</Text>}
          ListEmptyComponent={<EmptyState icon="person-add-outline" title={`No ${status.toLowerCase()} ${cat.toLowerCase()} registrations`} body="Register a new contact to see it here." action={can("registrations", "add") ? <Button label="New registration" small onPress={() => router.push("/registrations/new")} testID="registrations-empty-add" /> : undefined} />}
          renderItem={({ item: r }) => (
            <Pressable onPress={() => router.push(`/registrations/${r.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]} testID={`registration-card-${r.id}`}>
              <Avatar name={`${r.first_name} ${r.last_name}`} tone="gold" />
              <View style={{ flex: 1 }}>
                <View style={s.between}>
                  <Text style={s.name}>{r.first_name} {r.last_name}</Text>
                  <Text style={s.caption}>{fmtDate(r.created_at)}</Text>
                </View>
                <Text style={s.meta}>{r.registration_no} · {r.mobile}</Text>
                <View style={[s.between, { marginTop: 8 }]}>
                  <Badge label={r.status} small />
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
  catRow: { flexDirection: "row", gap: 8, marginBottom: spacing.lg },
  catItem: { flex: 1 },
  cat: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, paddingHorizontal: 8, alignItems: "center", justifyContent: "center", gap: 6, height: 118, shadowColor: colors.forestDeep, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  catSel: { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
  catIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.forestSoft, alignItems: "center", justifyContent: "center" },
  catText: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, color: colors.onSurface, textAlign: "center" },
  catCount: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20, color: colors.brandPrimary },
  segment: { flexDirection: "row", backgroundColor: colors.surfaceTertiary, borderRadius: radius.pill, padding: 4, marginBottom: spacing.md },
  segBtn: { flex: 1, height: 38, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  segSel: { backgroundColor: colors.brandSecondary },
  segText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.onSurfaceTertiary },
  card: { flexDirection: "row", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14, shadowColor: colors.forestDeep, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
}));
