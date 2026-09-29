import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get } from "@/src/api";
import { BRAND, IMAGES } from "@/src/brand";
import { Badge, ChipRow, EmptyState, ErrorState, Loading, SearchBar, useScreenStyles } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const STATUSES = ["All", "Available", "Booked", "Reserved", "Sold"];

// Screen 20 · Inventory
export default function Inventory() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tower, setTower] = useState("All");
  const [status, setStatus] = useState("All");
  const [q, setQ] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const units = useQuery({ queryKey: ["units"], queryFn: () => get<any[]>("/units") });
  const summary = useQuery({ queryKey: ["units-summary"], queryFn: () => get("/units/summary") });
  const towers = ["All", ...(summary.data?.towers ?? [])];
  const list = (units.data ?? []).filter((u) => (tower === "All" || u.tower === tower) && (status === "All" || u.status === status) && (!q || u.unit_no.toLowerCase().includes(q.toLowerCase()) || u.configuration.toLowerCase().includes(q.toLowerCase())));

  return (
    <View style={s.screen} testID="inventory-screen">
      <View style={styles.hero}>
        <Image source={IMAGES["hero-fountain"]} style={styles.heroImg} contentFit="cover" />
        <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.heroImg} />
        <View style={[styles.heroContent, { paddingTop: insets.top + 12 }]}>
          <View style={s.between}>
            <Badge label={BRAND.status.toUpperCase()} tone="gold" small />
            <Pressable onPress={() => router.push("/notifications")} hitSlop={8} testID="inventory-notifications-button"><Ionicons name="notifications-outline" size={22} color={colors.onImage} /></Pressable>
          </View>
          <View>
            <Text style={styles.heroTitle}>{BRAND.name} Inventory</Text>
            <Text style={styles.heroSub}>{summary.data ? `${summary.data.towers.length} blocks · ${summary.data.total} units · ${summary.data.available} available` : BRAND.location}</Text>
          </View>
        </View>
      </View>
      <View style={[s.content, { paddingTop: spacing.md, paddingBottom: 0 }]}>
        <SearchBar value={q} onChange={setQ} placeholder="Search unit or configuration" testID="inventory-search" onFilter={() => setShowFilter((v) => !v)} />
      </View>
      <ChipRow options={towers} value={tower} onChange={setTower} testIDPrefix="tower" />
      {showFilter ? <ChipRow options={STATUSES} value={status} onChange={setStatus} testIDPrefix="status" /> : null}
      {units.isLoading ? <Loading /> : units.isError ? <ErrorState message={(units.error as Error).message} onRetry={units.refetch} /> : (
        <FlatList
          data={list}
          keyExtractor={(u) => u.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 24, gap: 10 }}
          refreshControl={<RefreshControl refreshing={units.isRefetching} onRefresh={units.refetch} tintColor={colors.brandPrimary} />}
          ListHeaderComponent={<Text style={s.caption}>{list.length} unit{list.length === 1 ? "" : "s"} · Sample inventory for demonstration</Text>}
          ListEmptyComponent={<EmptyState icon="layers-outline" title="No units match your filter" body="Try a different block or status." />}
          renderItem={({ item: u }) => (
            <Pressable onPress={() => router.push(`/units/${u.id}`)} style={({ pressed }) => [styles.unit, pressed && { opacity: 0.9 }]} testID={`unit-card-${u.id}`}>
              <View style={s.between}>
                <Text style={styles.unitNo}>{u.unit_no}</Text>
                <Badge label={u.status} small />
              </View>
              <Text style={styles.cfg}>{u.configuration}</Text>
              <Text style={s.meta}>{u.tower} · {u.floor}</Text>
              <View style={[s.between, { marginTop: 10 }]}>
                <Text style={s.caption}>{u.area_sqft} sq.ft</Text>
                <View style={s.row}><Text style={s.link}>Details</Text><Ionicons name="chevron-forward" size={13} color={colors.brandPrimary} /></View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  hero: { height: 200, backgroundColor: colors.forestDeep },
  heroImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  heroContent: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, justifyContent: "space-between" },
  heroTitle: { fontFamily: fonts.display, fontSize: 30, color: colors.onImage },
  heroSub: { fontFamily: fonts.body, fontSize: 13, color: colors.onImageMuted, marginTop: 4 },
  unit: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14 },
  unitNo: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted, letterSpacing: 0.5 },
  cfg: { fontFamily: fonts.display, fontSize: 24, color: colors.onSurface, marginTop: 8 },
}));
