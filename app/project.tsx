import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get } from "@/src/api";
import { img, LOGO_WHITE } from "@/src/brand";
import { Badge, BottomNav, Button, Card, ErrorState, InfoRow, Loading, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

// Screen 29 · Project Overview
export default function Project() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => get<any[]>("/projects") });
  const p = projects.data?.[0];

  return (
    <View style={s.screen} testID="project-screen">
      {projects.isLoading ? <Loading /> : projects.isError || !p ? <ErrorState message={(projects.error as Error)?.message ?? "Failed"} onRetry={projects.refetch} /> : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <Image source={img(p.hero_image)} style={styles.fill} contentFit="cover" />
              <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.fill} />
              <View style={[styles.heroTop, { paddingTop: insets.top + 6 }]}>
                <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/home"))} style={styles.circle} testID="project-back-button"><Ionicons name="arrow-back" size={20} color={colors.onSurface} /></Pressable>
                <Pressable onPress={() => router.push("/notifications")} style={styles.circle} testID="project-notifications-button"><Ionicons name="notifications-outline" size={18} color={colors.onSurface} /></Pressable>
              </View>
              <View style={styles.heroText}>
                <Image source={LOGO_WHITE} style={{ width: 110, height: 96 }} contentFit="contain" />
                <Text style={styles.heroTag}>{p.tagline}</Text>
                <View style={s.row}><Ionicons name="location-outline" size={14} color={colors.brandSecondary} /><Text style={styles.heroLoc}> {p.location.toUpperCase()} · {p.status.toUpperCase()}</Text></View>
              </View>
            </View>

            <View style={s.content}>
              <View style={{ flexDirection: "row", gap: 10, marginTop: -28 }}>
                {[{ v: p.project_type, l: "Type" }, { v: p.configuration, l: "Configuration" }, { v: p.price_from, l: "Price from" }].map((x) => (
                  <Card key={x.l} style={{ flex: 1, padding: 12, alignItems: "center" }}>
                    <Text style={styles.kpi} numberOfLines={2}>{x.v}</Text>
                    <Text style={styles.kpiLabel}>{x.l.toUpperCase()}</Text>
                  </Card>
                ))}
              </View>

              <SectionLabel style={{ marginTop: spacing.xl }}>Project Overview</SectionLabel>
              <Text style={styles.positioning}>{p.positioning}</Text>
              <Text style={[s.body, { marginTop: 8 }]}>{p.intro}</Text>

              <SectionLabel style={{ marginTop: spacing.xl }}>Key Highlights</SectionLabel>
              <Card>
                {p.highlights.map((h: string, i: number) => (
                  <View key={h} style={[s.row, { gap: 10, paddingVertical: 8 }, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                    <Ionicons name="leaf" size={16} color={colors.brandTertiary} />
                    <Text style={[s.body, { fontSize: 14, flex: 1 }]}>{h}</Text>
                  </View>
                ))}
              </Card>
            </View>

            <SectionLabel style={{ marginLeft: spacing.lg, marginTop: spacing.xl }}>Amenities</SectionLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 10 }} testID="amenities-carousel">
              {p.amenities.map((a: any) => (
                <View key={a.title} style={[styles.amenity, { width: width * 0.56 }]}>
                  <Image source={img(a.image)} style={styles.fill} contentFit="cover" />
                  <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.fill} />
                  <View style={styles.amenityText}>
                    <View style={styles.amenityIcon}><Ionicons name={a.icon} size={16} color={colors.onBrandSecondary} /></View>
                    <Text style={styles.amenityTitle}>{a.title}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={s.content}>
              <SectionLabel style={{ marginTop: spacing.xl }}>Gallery</SectionLabel>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {p.gallery.map((g: string) => <Image key={g} source={img(g)} style={styles.galleryImg} contentFit="cover" />)}
              </View>

              <SectionLabel style={{ marginTop: spacing.xl }}>Project Details</SectionLabel>
              <Card>
                <InfoRow icon="location-outline" label="Location" value={p.location} />
                <InfoRow icon="business-outline" label="Project type" value={p.project_type} />
                <InfoRow icon="grid-outline" label="Configuration" value={p.configuration} />
                <InfoRow icon="resize-outline" label="Total area" value={p.total_area} />
                <InfoRow icon="calendar-outline" label="Possession" value={p.possession} />
                <InfoRow icon="ribbon-outline" label="RERA number" value={p.rera_number} />
                <InfoRow icon="people-outline" label="Developer" value={p.developer} />
              </Card>
              <View style={[s.row, { gap: 8, marginTop: spacing.md }]}>
                <Badge label={p.status} tone="gold" />
                <Text style={s.caption}>Details marked {"\"To be announced\""} will be updated by County Greens.</Text>
              </View>
            </View>
          </ScrollView>
          <View style={[styles.footer, { flexDirection: "row", gap: 10 }]}>
            <Button label="Brochure" variant="secondary" icon="document-text-outline" onPress={() => router.push("/documents")} style={{ flex: 1 }} testID="project-brochure-button" />
            <Button label="Schedule visit" variant="gold" icon="calendar-outline" onPress={() => router.push("/visits/new")} style={{ flex: 1.2 }} testID="project-schedule-button" />
          </View>
        </>
      )}
      <BottomNav />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  hero: { height: 380, backgroundColor: colors.forestDeep },
  heroTop: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg },
  circle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  heroText: { flex: 1, justifyContent: "flex-end", paddingHorizontal: spacing.lg, paddingBottom: 48, gap: 6 },
  heroTag: { fontFamily: fonts.displayItalic, fontSize: 32, color: colors.onImage },
  heroLoc: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 2, color: colors.brandSecondary },
  kpi: { fontFamily: fonts.displaySemi, fontSize: 15, color: colors.onSurface, textAlign: "center" },
  kpiLabel: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1, color: colors.muted, marginTop: 4 },
  positioning: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.brandPrimary },
  amenity: { height: 170, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.forestDeep },
  amenityText: { flex: 1, justifyContent: "flex-end", padding: 14, gap: 8 },
  amenityIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  amenityTitle: { fontFamily: fonts.displaySemi, fontSize: 17, lineHeight: 21, color: colors.onImage },
  galleryImg: { width: "31%", flexGrow: 1, height: 110, borderRadius: radius.md },
  footer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
}));
