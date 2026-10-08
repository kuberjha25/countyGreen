import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get } from "@/src/api";
import { ADMIN_ROLE_ID, isStaff } from "@/src/access";
import { useAuth, useCan } from "@/src/auth";
import { BRAND, img, LEAF } from "@/src/brand";
import { Avatar, Badge, useScreenStyles } from "@/src/components/ui";
import { fmtDate } from "@/src/format";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Tile = { title: string; icon: string; value?: number; sub: string; pathname: string; params?: Record<string, string>; featured?: boolean; show?: boolean };

// Screen 8 · Dashboard — every tile opens the matching detailed list (e.g. Converted Leads → converted lead listing).
export default function Home() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const can = useCan();
  const staff = isStaff(user);
  const { width } = useWindowDimensions();
  const [slide, setSlide] = useState(0);
  const cardW = width - spacing.lg * 2;

  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => get("/dashboard") });
  const d = dash.data;
  const project = d?.featured?.[0];
  const slides = project ? [{ image: project.hero_image, title: `${project.name} · ${project.status}`, sub: project.tagline }, ...(project.gallery ?? []).slice(0, 2).map((g: string, i: number) => ({ image: g, title: project.highlights?.[i + 1] ?? project.positioning, sub: project.location }))] : [{ image: "hero-security", title: `${BRAND.name} · ${BRAND.status}`, sub: BRAND.tagline }];

  const LEADS = "/(tabs)/leads", VISITS = "/(tabs)/visits";
  const tiles: Tile[] = (staff
    ? [
        { title: "Total Leads", icon: "people-outline", value: d?.leads, sub: "All leads", pathname: LEADS, params: { status: "All" }, featured: true },
        { title: "Pending Visits", icon: "calendar-outline", value: d?.visits_upcoming, sub: d ? `of ${d.visits} project visits` : "", pathname: VISITS, params: { status: "In Progress" }, featured: true },
        { title: "In Progress", icon: "hourglass-outline", value: d?.leads_in_progress, sub: "Leads being followed up", pathname: LEADS, params: { status: "In Progress" } },
        { title: "Converted Leads", icon: "trophy-outline", value: d?.leads_converted, sub: "Converted lead listing", pathname: LEADS, params: { status: "Converted" } },
        { title: "Not Matured", icon: "close-circle-outline", value: d?.leads_not_matured, sub: "Closed without sale", pathname: LEADS, params: { status: "Not Matured" } },
        { title: "Attended Visits", icon: "checkmark-done-outline", value: d?.visits_attended, sub: "Completed site visits", pathname: VISITS, params: { status: "Attended" } },
        { title: "Availability", icon: "map-outline", value: d?.availability, sub: "Availability requests", pathname: "/availability", show: can("availability", "view") },
        { title: "Registrations", icon: "person-add-outline", value: d?.registrations_pending, sub: d ? `pending of ${d.registrations}` : "", pathname: "/registrations", params: { status: "Pending" }, show: can("registrations", "view") },
        { title: "Documents", icon: "document-text-outline", value: d?.documents, sub: "Brochures, plans & legal", pathname: "/documents" },
        { title: "MIS", icon: "stats-chart-outline", sub: "Reports", pathname: "/mis", show: can("mis", "view") },
        { title: "Projects", icon: "business-outline", value: d?.projects, sub: BRAND.location, pathname: "/project" },
      ]
    : [
        { title: "My Leads", icon: "people-outline", value: d?.leads, sub: d ? `${d.leads_in_progress} in progress` : "", pathname: LEADS, params: { status: "All" }, featured: true },
        { title: "Project Visits", icon: "calendar-outline", value: d?.visits, sub: d ? `${d.visits_upcoming} upcoming` : "", pathname: VISITS, params: { status: "All" }, featured: true },
        { title: "Converted Leads", icon: "trophy-outline", value: d?.leads_converted, sub: "Converted lead listing", pathname: LEADS, params: { status: "Converted" } },
        { title: "Our Products", icon: "map-outline", value: d?.products, sub: "Request for availability", pathname: "/(tabs)/products" },
        { title: "Documents", icon: "document-text-outline", value: d?.documents, sub: "Brochures, plans & legal", pathname: "/documents" },
        { title: "MIS", icon: "stats-chart-outline", sub: "Performance report", pathname: "/mis", show: can("mis", "view") },
      ]
  ).filter((t) => t.show !== false);

  return (
    <View style={s.screen} testID="home-screen">
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.push("/(tabs)/profile")} style={[s.row, { gap: 10 }]} testID="home-avatar-button">
          <Avatar name={`${user?.first_name ?? "C"} ${user?.last_name ?? "G"}`} size={40} />
          <View>
            <Text style={styles.partnerLabel}>{(staff ? user?.role_name ?? "Staff" : user?.partner_type ?? "Channel Partner").toUpperCase()}</Text>
            <Text style={styles.partnerName} numberOfLines={1}>{`${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Partner"}</Text>
          </View>
        </Pressable>
        <Image source={LEAF} style={{ width: 26, height: 26 }} contentFit="contain" />
        <Pressable onPress={() => router.push("/notifications")} style={styles.bell} testID="home-notifications-button">
          <Ionicons name="notifications-outline" size={22} color={colors.onSurface} />
          {d?.unread_notifications ? (
            <View style={styles.dot}>
              <Text style={styles.dotText}>{d.unread_notifications}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={dash.isRefetching} onRefresh={dash.refetch} tintColor={colors.brandPrimary} />}>
        <Animated.View entering={FadeInDown.duration(500)}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / width))} testID="hero-carousel">
            {slides.map((sl: any, i: number) => (
              <Pressable key={i} onPress={() => router.push("/project")} style={{ width, paddingHorizontal: spacing.lg }} testID={`hero-slide-${i}`}>
                <View style={[styles.hero, { width: cardW }]}>
                  <Image source={img(sl.image)} style={styles.fill} contentFit="cover" transition={300} />
                  <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.fill} />
                  <View style={styles.heroText}>
                    <Badge label={BRAND.location.toUpperCase()} tone="gold" small />
                    <Text style={styles.heroTitle} numberOfLines={2}>{sl.title}</Text>
                    <Text style={styles.heroSub} numberOfLines={1}>{sl.sub}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.dots}>
            {slides.map((_: any, i: number) => <View key={i} style={[styles.dotIndicator, i === slide && styles.dotActive]} />)}
          </View>
        </Animated.View>

        <View style={s.content}>
          <View style={[s.between, { marginBottom: spacing.md }]}>
            <Text style={styles.sectionTitle}>{user?.role_id === ADMIN_ROLE_ID ? "Admin Dashboard" : "Dashboard"}</Text>
            <Text style={s.caption}>{fmtDate(new Date().toISOString())}</Text>
          </View>

          <View style={styles.grid}>
            {tiles.map((w, i) => {
              const dark = !!w.featured;
              return (
                <Animated.View key={w.title} entering={FadeInUp.delay(60 * i).duration(450)} style={styles.gridItem}>
                  <Pressable onPress={() => router.push({ pathname: w.pathname as any, params: w.params })} style={({ pressed }) => [styles.widget, dark && styles.widgetDark, pressed && { transform: [{ scale: 0.98 }], opacity: 0.95 }]} testID={`widget-${w.title.toLowerCase().replace(/\s+/g, "-")}`}>
                    <View style={[s.between, { alignItems: "flex-start" }]}>
                      <View style={[styles.widgetIcon, dark && { backgroundColor: colors.brandSecondary }]}>
                        <Ionicons name={w.icon as any} size={19} color={dark ? colors.forestDeep : colors.brandPrimary} />
                      </View>
                      <Ionicons name="arrow-forward" size={15} color={dark ? colors.onImageMuted : colors.muted} />
                    </View>
                    <View style={{ marginTop: spacing.md }}>
                      {w.pathname !== "/mis" ? (
                        <Text style={[styles.widgetValue, dark && { color: colors.onImage }]}>{dash.isLoading || w.value === undefined ? "—" : w.value}</Text>
                      ) : (
                        <Text style={[styles.widgetValue, dark && { color: colors.onImage }, { fontSize: 22, lineHeight: 34 }]}>View</Text>
                      )}
                      <Text style={[styles.widgetTitle, dark && { color: colors.onImage }]}>{w.title}</Text>
                      <Text style={[styles.widgetSub, dark && { color: colors.onImageMuted }]} numberOfLines={1}>{w.sub}</Text>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          {staff || !can("registrations", "view") ? null : <Pressable onPress={() => router.push("/registrations")} style={({ pressed }) => [styles.regBanner, pressed && { opacity: 0.92 }]} testID="home-registrations-banner">
            <View style={[styles.widgetIcon, { backgroundColor: colors.goldSoft }]}>
              <Ionicons name="person-add-outline" size={19} color={colors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>Registrations</Text>
              <Text style={s.meta}>{d ? `${d.registrations} registered channel partners, brokers & influencers` : "Register channel partners, brokers & influencers"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>}

          <View style={[s.between, { marginTop: spacing.xl, marginBottom: spacing.md }]}>
            <Text style={styles.sectionTitle}>Latest Updates</Text>
            <Pressable onPress={() => router.push("/news")} testID="home-news-all"><Text style={s.link}>View all</Text></Pressable>
          </View>
          <View style={{ gap: 12 }}>
            {(d?.news ?? []).map((n: any) => (
              <Pressable key={n.id} onPress={() => router.push(`/news/${n.id}`)} style={({ pressed }) => [styles.newsRow, pressed && { opacity: 0.92 }]} testID={`home-news-${n.id}`}>
                <Image source={img(n.image)} style={styles.newsImg} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Badge label={n.category} small />
                  <Text style={[s.name, { marginTop: 6 }]} numberOfLines={2}>{n.title}</Text>
                  <Text style={s.meta}>{fmtDate(n.published_at)}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: 12 },
  partnerLabel: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1.6, color: colors.brandSecondary },
  partnerName: { fontFamily: fonts.medium, fontSize: 14, color: colors.onSurface, maxWidth: 150 },
  bell: { width: 44, height: 44, alignItems: "center", justifyContent: "flex-end", flexDirection: "row" },
  dot: { position: "absolute", top: 6, right: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  dotText: { fontFamily: fonts.semibold, fontSize: 9, color: colors.onBrandSecondary },
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  hero: { height: 220, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.forestDeep },
  heroText: { flex: 1, justifyContent: "flex-end", padding: spacing.lg, gap: 6 },
  heroTitle: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.onImage },
  heroSub: { fontFamily: fonts.body, fontSize: 13, color: colors.onImageMuted },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 12, marginBottom: spacing.lg },
  dotIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 18, backgroundColor: colors.brandSecondary },
  sectionTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.onSurface },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridItem: { width: "47%", flexGrow: 1 },
  widget: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, minHeight: 150, shadowColor: colors.forestDeep, shadowOpacity: 0.07, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  widgetDark: { backgroundColor: colors.surfaceInverse, borderColor: colors.surfaceInverse },
  widgetIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.forestSoft, alignItems: "center", justifyContent: "center" },
  widgetValue: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: colors.onSurface },
  widgetTitle: { fontFamily: fonts.semibold, fontSize: 13, color: colors.onSurface, marginTop: 2 },
  widgetSub: { fontFamily: fonts.body, fontSize: 11, color: colors.muted, marginTop: 2 },
  regBanner: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: spacing.md, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, shadowColor: colors.forestDeep, shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  newsRow: { flexDirection: "row", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 10 },
  newsImg: { width: 92, height: 92, borderRadius: radius.md },
}));
