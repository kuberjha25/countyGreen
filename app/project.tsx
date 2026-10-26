import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCan } from "@/src/auth";
import { imageSource, LOGO_WHITE } from "@/src/brand";
import { Badge, BottomNav, Button, Card, ErrorState, InfoRow, Loading, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { fmtDate, plainText } from "@/src/format";
import { useProjects } from "@/src/lookups";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchProject, fetchProjects } from "@/src/store/catalogSlice";
import { fonts, makeStyles, spacing, useTheme } from "@/src/theme";
import { label } from "@/src/types";

// Screen 29 · Project Overview (GET /api/projects/{id}; the first project when no id is given).
export default function Project() {
  const params = useLocalSearchParams<{ id?: string }>();
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const can = useCan();
  const projects = useProjects();
  const id = params.id ? Number(params.id) : projects.data?.[0]?.id;
  const entry = useAppSelector((st) => (id ? st.catalog.projectById[id] : undefined));
  const p = entry?.data;

  useEffect(() => {
    if (id && !entry) dispatch(fetchProject(id));
  }, [dispatch, id, entry]);

  const failed = entry?.status === "failed" || projects.status === "failed";
  const retry = () => (id ? dispatch(fetchProject(id)) : dispatch(fetchProjects()));
  const highlights = (p?.highlights ?? []).map((h) => (typeof h === "string" ? h : [h.title, h.description].filter(Boolean).join(" — ")));

  return (
    <View style={s.screen} testID="project-screen">
      {!p ? (
        failed ? <ErrorState message={entry?.error ?? projects.error ?? "Could not load the project"} onRetry={retry} /> : projects.status === "succeeded" && !id ? <ErrorState message="No projects yet." onRetry={retry} /> : <Loading />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <Image source={imageSource(p.image_url)} style={styles.fill} contentFit="cover" />
              <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.fill} />
              <View style={[styles.heroTop, { paddingTop: insets.top + 6 }]}>
                <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/home"))} style={styles.circle} testID="project-back-button"><Ionicons name="arrow-back" size={20} color={colors.onSurface} /></Pressable>
                <Pressable onPress={() => router.push("/notifications")} style={styles.circle} testID="project-notifications-button"><Ionicons name="notifications-outline" size={18} color={colors.onSurface} /></Pressable>
              </View>
              <View style={styles.heroText}>
                <Image source={p.logo_url ? { uri: p.logo_url } : LOGO_WHITE} style={{ width: 110, height: 96 }} contentFit="contain" />
                <Text style={styles.heroTag}>{p.name}</Text>
                <View style={s.row}><Ionicons name="location-outline" size={14} color={colors.brandSecondary} /><Text style={styles.heroLoc}> {[p.city, p.state].filter(Boolean).join(", ").toUpperCase()}{p.status ? ` · ${p.status.toUpperCase()}` : ""}</Text></View>
              </View>
            </View>

            <View style={s.content}>
              <View style={{ flexDirection: "row", gap: 10, marginTop: -28 }}>
                {[{ v: label({}, p.type), l: "Type" }, { v: p.towers_count ? String(p.towers_count) : "—", l: "Towers" }, { v: p.units_count ? String(p.units_count) : "—", l: "Units" }].map((x) => (
                  <Card key={x.l} style={{ flex: 1, padding: 12, alignItems: "center" }}>
                    <Text style={styles.kpi} numberOfLines={2}>{x.v}</Text>
                    <Text style={styles.kpiLabel}>{x.l.toUpperCase()}</Text>
                  </Card>
                ))}
              </View>

              <SectionLabel style={{ marginTop: spacing.xl }}>Project Overview</SectionLabel>
              {p.short_description ? <Text style={styles.positioning}>{p.short_description}</Text> : null}
              {p.description ? <Text style={[s.body, { marginTop: 8 }]}>{plainText(p.description)}</Text> : null}

              {p.configuration_pricing?.length ? (
                <>
                  <SectionLabel style={{ marginTop: spacing.xl }}>Configurations & Pricing</SectionLabel>
                  <Card>
                    {p.configuration_pricing.map((c, i) => (
                      <View key={`${c.category}-${i}`} style={[s.between, { paddingVertical: 8 }, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                        <View>
                          <Text style={s.name}>{c.category}</Text>
                          <Text style={s.caption}>{Number(c.area).toLocaleString("en-IN")} {c.area_unit}</Text>
                        </View>
                        <Text style={[s.name, { color: colors.brandPrimary }]}>{c.formatted_price}</Text>
                      </View>
                    ))}
                  </Card>
                </>
              ) : null}

              {highlights.length ? (
                <>
                  <SectionLabel style={{ marginTop: spacing.xl }}>Key Highlights</SectionLabel>
                  <Card>
                    {highlights.map((h, i) => (
                      <View key={i} style={[s.row, { gap: 10, paddingVertical: 8 }, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                        <Ionicons name="leaf" size={16} color={colors.brandTertiary} />
                        <Text style={[s.body, { fontSize: 14, flex: 1 }]}>{h}</Text>
                      </View>
                    ))}
                  </Card>
                </>
              ) : null}

              {(p.amenities ?? []).length ? (
                <>
                  <SectionLabel style={{ marginTop: spacing.xl }}>Amenities</SectionLabel>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {(p.amenities ?? []).map((a) => <Badge key={a} label={a} tone="brand" />)}
                  </View>
                </>
              ) : null}

              <SectionLabel style={{ marginTop: spacing.xl }}>Project Details</SectionLabel>
              <Card>
                <InfoRow icon="location-outline" label="Address" value={[p.address, p.city, p.state].filter(Boolean).join(", ")} />
                <InfoRow icon="business-outline" label="Project type" value={label({}, p.type)} />
                <InfoRow icon="calendar-outline" label="Possession" value={p.possession_date ? fmtDate(p.possession_date) : undefined} />
                <InfoRow icon="ribbon-outline" label="RERA number" value={p.rera_number ?? undefined} />
              </Card>
            </View>
          </ScrollView>
          <View style={[styles.footer, { flexDirection: "row", gap: 10 }]}>
            <Button label="Brochure" variant="secondary" icon="document-text-outline" onPress={() => (p.brochure_url ? Linking.openURL(p.brochure_url) : router.push("/documents"))} style={{ flex: 1 }} testID="project-brochure-button" />
            {can("visits", "add") ? (
              <Button label="Schedule visit" variant="gold" icon="calendar-outline" onPress={() => router.push("/visits/new")} style={{ flex: 1.2 }} testID="project-schedule-button" />
            ) : (
              <Button label="Our products" variant="gold" icon="map-outline" onPress={() => router.push("/(tabs)/products")} style={{ flex: 1.2 }} testID="project-products-button" />
            )}
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
  positioning: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.brandPrimary },
  footer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
}));
