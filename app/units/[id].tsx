import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get } from "@/src/api";
import { BRAND, img } from "@/src/brand";
import { Badge, BottomNav, Button, Card, ErrorState, InfoRow, Loading, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

// Screen 21 · Inventory / Unit Details
export default function UnitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const unit = useQuery({ queryKey: ["unit", id], queryFn: () => get(`/units/${id}`) });
  const u = unit.data;

  return (
    <View style={s.screen} testID="unit-detail-screen">
      {unit.isLoading ? <Loading /> : unit.isError || !u ? <ErrorState message={(unit.error as Error)?.message ?? "Not found"} onRetry={unit.refetch} /> : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <Image source={img(u.image)} style={styles.heroImg} contentFit="cover" />
              <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.heroImg} />
              <View style={[styles.heroTop, { paddingTop: insets.top + 6 }]}>
                <Pressable onPress={() => router.back()} style={styles.circle} testID="unit-back-button"><Ionicons name="arrow-back" size={20} color={colors.onSurface} /></Pressable>
                <Pressable onPress={() => toast.show("Unit added to your shortlist", "success")} style={styles.circle} testID="unit-save-button"><Ionicons name="bookmark-outline" size={18} color={colors.onSurface} /></Pressable>
              </View>
              <View style={styles.heroText}>
                <Badge label={u.status} small />
                <Text style={styles.heroTitle}>{u.configuration}</Text>
                <Text style={styles.heroSub}>Unit {u.unit_no} · {u.tower} · {u.floor}</Text>
              </View>
            </View>

            <View style={s.content}>
              <View style={{ flexDirection: "row", gap: 10, marginTop: -28 }}>
                {[{ v: `${u.area_sqft}`, l: "Super area sq.ft" }, { v: `${u.carpet_sqft}`, l: "Carpet sq.ft" }, { v: u.facing, l: "Facing" }].map((x) => (
                  <Card key={x.l} style={{ flex: 1, padding: 12, alignItems: "center" }}>
                    <Text style={styles.kpi}>{x.v}</Text>
                    <Text style={styles.kpiLabel}>{x.l.toUpperCase()}</Text>
                  </Card>
                ))}
              </View>

              <SectionLabel style={{ marginTop: spacing.xl }}>Unit Information</SectionLabel>
              <Card>
                <InfoRow icon="home-outline" label="Project" value={`${BRAND.name}, ${BRAND.location}`} />
                <InfoRow icon="business-outline" label="Block / Tower" value={u.tower} />
                <InfoRow icon="layers-outline" label="Floor" value={u.floor} />
                <InfoRow icon="grid-outline" label="Configuration" value={u.configuration} />
                <InfoRow icon="resize-outline" label="Balconies" value={`${u.balconies}`} />
                <InfoRow icon="car-outline" label="Parking allocation" value={u.parking} />
              </Card>

              <SectionLabel style={{ marginTop: spacing.xl }}>Pricing & Availability</SectionLabel>
              <Card>
                <InfoRow icon="pricetag-outline" label="Price" value={u.price} />
                <InfoRow icon="flag-outline" label="Availability status" value={u.status} />
                <InfoRow icon="calendar-outline" label="Possession" value="To be announced" />
              </Card>
              <View style={styles.note}>
                <Ionicons name="information-circle-outline" size={16} color={colors.warning} />
                <Text style={styles.noteText}>{u.note}</Text>
              </View>
            </View>
          </ScrollView>
          <View style={[styles.footer, { flexDirection: "row", gap: 10 }]}>
            <Button label="Floor plan" variant="secondary" icon="map-outline" onPress={() => router.push("/documents")} style={{ flex: 1 }} testID="unit-floorplan-button" />
            <Button label="Schedule visit" variant="gold" icon="calendar-outline" onPress={() => router.push("/visits/new")} style={{ flex: 1 }} testID="unit-schedule-button" />
          </View>
        </>
      )}
      <BottomNav active="inventory" />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  hero: { height: 320, backgroundColor: colors.forestDeep },
  heroImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg },
  circle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  heroText: { flex: 1, justifyContent: "flex-end", paddingHorizontal: spacing.lg, paddingBottom: 44, gap: 6 },
  heroTitle: { fontFamily: fonts.display, fontSize: 36, color: colors.onImage },
  heroSub: { fontFamily: fonts.body, fontSize: 14, color: colors.onImageMuted },
  kpi: { fontFamily: fonts.displaySemi, fontSize: 20, color: colors.onSurface },
  kpiLabel: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1, color: colors.muted, marginTop: 2, textAlign: "center" },
  note: { flexDirection: "row", gap: 8, marginTop: spacing.lg, padding: 12, borderRadius: radius.md, backgroundColor: colors.warningSoft },
  noteText: { flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.warning },
  footer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
}));
