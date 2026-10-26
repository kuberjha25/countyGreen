import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { isStaff, isSuperAdmin } from "@/src/access";
import { useAuth } from "@/src/auth";
import { imageSource, LEAF, partnerTypeName } from "@/src/brand";
import { Avatar, Badge, useScreenStyles } from "@/src/components/ui";
import { fmtDate } from "@/src/format";
import { useProjects } from "@/src/lookups";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchProfile } from "@/src/store/authSlice";
import { fetchProjects } from "@/src/store/catalogSlice";
import { fetchNews, fetchNotifications } from "@/src/store/contentSlice";
import { fetchCounts } from "@/src/store/dashboardSlice";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { label, NEWS_CATEGORIES } from "@/src/types";

type Tile = { title: string; icon: string; value?: number; sub: string; pathname: string; params?: Record<string, string>; featured?: boolean; counted?: boolean };

// Screen 8 · Dashboard — every tile opens the matching detailed list (e.g. Converted Leads → converted lead listing).
export default function Home() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const staff = isStaff(user);
  const { width } = useWindowDimensions();
  const [slide, setSlide] = useState(0);
  const cardW = width - spacing.lg * 2;

  const projects = useProjects();
  const dash = useAppSelector((st) => st.dashboard);
  const news = useAppSelector((st) => st.content.news);
  const unread = useAppSelector((st) => (st.content.notifications.data ?? []).filter((n) => !n.is_read).length);
  const c = dash.counts;

  const load = useCallback(() => {
    dispatch(fetchCounts(staff));
    dispatch(fetchNews({ params: {} }));
    dispatch(fetchNotifications());
  }, [dispatch, staff]);
  useEffect(load, [load]);
  const refresh = () => {
    load();
    dispatch(fetchProfile());
    dispatch(fetchProjects());
  };

  const list = projects.data ?? [];
  const slides = list.map((p) => ({ image: imageSource(p.image_url), city: p.city ?? "", title: p.name, sub: p.short_description || [p.city, p.state].filter(Boolean).join(", "), id: p.id }));

  const LEADS = "/(tabs)/leads";
  const VISITS = "/(tabs)/visits";
  const tiles: Tile[] = staff
    ? [
        { title: "Total Leads", icon: "people-outline", value: c?.leads, sub: "All leads", pathname: LEADS, params: { status: "all" }, featured: true, counted: true },
        { title: "Pending Visits", icon: "calendar-outline", value: c?.visitsScheduled, sub: c ? `of ${c.visits} project visits` : "", pathname: VISITS, params: { status: "scheduled" }, featured: true, counted: true },
        { title: "New Leads", icon: "sparkles-outline", value: c?.leadsNew, sub: "Not contacted yet", pathname: LEADS, params: { status: "new" }, counted: true },
        { title: "Converted Leads", icon: "trophy-outline", value: c?.leadsConverted, sub: "Converted lead listing", pathname: LEADS, params: { status: "converted" }, counted: true },
        { title: "Completed Visits", icon: "checkmark-done-outline", value: c?.visitsCompleted, sub: "Attended site visits", pathname: VISITS, params: { status: "completed" }, counted: true },
        { title: "Registrations", icon: "person-add-outline", value: c?.registrationsPending, sub: "Pending approval", pathname: "/registrations", params: { status: "pending" }, counted: true },
        { title: "Documents", icon: "document-text-outline", sub: "Brochures, plans & legal", pathname: "/documents" },
        { title: "Projects", icon: "business-outline", value: list.length || undefined, sub: "Project details", pathname: "/project", counted: true },
      ]
    : [
        { title: "My Leads", icon: "people-outline", value: c?.leads, sub: c ? `${c.leadsNew} new` : "", pathname: LEADS, params: { status: "all" }, featured: true, counted: true },
        { title: "Project Visits", icon: "calendar-outline", value: c?.visits, sub: c ? `${c.visitsScheduled} scheduled` : "", pathname: VISITS, params: { status: "all" }, featured: true, counted: true },
        { title: "Converted Leads", icon: "trophy-outline", value: c?.leadsConverted, sub: "Converted lead listing", pathname: LEADS, params: { status: "converted" }, counted: true },
        { title: "Our Products", icon: "map-outline", sub: "Request for availability", pathname: "/(tabs)/products" },
        { title: "Documents", icon: "document-text-outline", sub: "Brochures, plans & legal", pathname: "/documents" },
        { title: "Projects", icon: "business-outline", value: list.length || undefined, sub: "Project details", pathname: "/project", counted: true },
      ];
  const role = staff ? user?.role?.name ?? "Staff" : partnerTypeName(user?.partner_profile?.partner_type);

  return (
    <View style={s.screen} testID="home-screen">
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.push("/(tabs)/profile")} style={[s.row, { gap: 10 }]} testID="home-avatar-button">
          <Avatar name={user?.name ?? "County Green"} size={40} />
          <View>
            <Text style={styles.partnerLabel}>{String(role).toUpperCase()}</Text>
            <Text style={styles.partnerName} numberOfLines={1}>{user?.name || "Partner"}</Text>
          </View>
        </Pressable>
        <Image source={LEAF} style={{ width: 26, height: 26 }} contentFit="contain" />
        <Pressable onPress={() => router.push("/notifications")} style={styles.bell} testID="home-notifications-button">
          <Ionicons name="notifications-outline" size={22} color={colors.onSurface} />
          {unread ? (
            <View style={styles.dot}>
              <Text style={styles.dotText}>{unread}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={dash.status === "loading" && !!c} onRefresh={refresh} tintColor={colors.brandPrimary} />}>
        {slides.length ? <Animated.View entering={FadeInDown.duration(500)}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(e) => setSlide(Math.round(e.nativeEvent.contentOffset.x / width))} testID="hero-carousel">
            {slides.map((sl, i) => (
              <Pressable key={i} onPress={() => router.push({ pathname: "/project", params: { id: String(sl.id) } })} style={{ width, paddingHorizontal: spacing.lg }} testID={`hero-slide-${i}`}>
                <View style={[styles.hero, { width: cardW }]}>
                  <Image source={sl.image} style={styles.fill} contentFit="cover" transition={300} />
                  <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.fill} />
                  <View style={styles.heroText}>
                    {sl.city ? <Badge label={sl.city.toUpperCase()} tone="gold" small /> : null}
                    <Text style={styles.heroTitle} numberOfLines={2}>{sl.title}</Text>
                    <Text style={styles.heroSub} numberOfLines={1}>{sl.sub}</Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.dots}>
            {slides.map((_, i) => <View key={i} style={[styles.dotIndicator, i === slide && styles.dotActive]} />)}
          </View>
        </Animated.View> : null}

        <View style={s.content}>
          <View style={[s.between, { marginBottom: spacing.md }]}>
            <Text style={styles.sectionTitle}>{isSuperAdmin(user) ? "Admin Dashboard" : "Dashboard"}</Text>
            <Text style={s.caption}>{fmtDate(new Date().toISOString())}</Text>
          </View>
          {dash.status === "failed" ? <Text style={[s.caption, { color: colors.error, marginBottom: spacing.sm }]}>{dash.error}</Text> : null}

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
                      {w.counted ? (
                        <Text style={[styles.widgetValue, dark && { color: colors.onImage }]}>{w.value === undefined ? "—" : w.value}</Text>
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

          <View style={[s.between, { marginTop: spacing.xl, marginBottom: spacing.md }]}>
            <Text style={styles.sectionTitle}>Latest Updates</Text>
            <Pressable onPress={() => router.push("/news")} testID="home-news-all"><Text style={s.link}>View all</Text></Pressable>
          </View>
          <View style={{ gap: 12 }}>
            {news.items.slice(0, 3).map((n) => (
              <Pressable key={n.id} onPress={() => router.push(`/news/${n.id}`)} style={({ pressed }) => [styles.newsRow, pressed && { opacity: 0.92 }]} testID={`home-news-${n.id}`}>
                <Image source={imageSource(n.image_url)} style={styles.newsImg} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Badge label={label(NEWS_CATEGORIES, n.category)} small />
                  <Text style={[s.name, { marginTop: 6 }]} numberOfLines={2}>{n.title}</Text>
                  <Text style={s.meta}>{fmtDate(n.publish_date ?? undefined)}</Text>
                </View>
              </Pressable>
            ))}
            {news.status === "succeeded" && !news.items.length ? <Text style={s.bodyMuted}>No updates yet.</Text> : null}
            {news.status === "failed" ? <Text style={s.bodyMuted}>{news.error}</Text> : null}
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
  newsRow: { flexDirection: "row", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 10 },
  newsImg: { width: 92, height: 92, borderRadius: radius.md, backgroundColor: colors.forestSoft },
}));
