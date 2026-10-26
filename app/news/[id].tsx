import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { imageSource } from "@/src/brand";
import { Badge, BottomNav, ErrorState, Loading, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { fmtDate, plainText } from "@/src/format";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchNewsItem } from "@/src/store/contentSlice";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { label, NEWS_CATEGORIES } from "@/src/types";

// Screen 24 · News Article (GET /api/news/{id})
export default function Article() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const entry = useAppSelector((st) => st.content.newsById[Number(id)]);
  const all = useAppSelector((st) => st.content.news.items);
  const related = all.filter((x) => x.id !== Number(id)).slice(0, 3);
  const n = entry?.data;

  useEffect(() => {
    if (!entry) dispatch(fetchNewsItem(Number(id)));
  }, [dispatch, id, entry]);

  return (
    <View style={s.screen} testID="article-screen">
      {!n ? (
        entry?.status === "failed" ? <ErrorState message={entry.error ?? "Not found"} onRetry={() => dispatch(fetchNewsItem(Number(id)))} /> : <Loading />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Image source={imageSource(n.image_url)} style={styles.fill} contentFit="cover" />
            <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.fill} />
            <View style={[styles.heroTop, { paddingTop: insets.top + 6 }]}>
              <Pressable onPress={() => router.back()} style={styles.circle} testID="article-back-button"><Ionicons name="arrow-back" size={20} color={colors.onSurface} /></Pressable>
              <Pressable onPress={() => Share.share({ message: `${n.title} — County Green` })} style={styles.circle} testID="article-share-button"><Ionicons name="share-social-outline" size={18} color={colors.onSurface} /></Pressable>
            </View>
            <View style={styles.heroText}>
              <Badge label={label(NEWS_CATEGORIES, n.category)} tone="gold" small />
            </View>
          </View>
          <View style={s.content}>
            <Text style={styles.title} testID="article-title">{n.title}</Text>
            <Text style={[s.caption, { marginTop: 10, marginBottom: spacing.xl }]}>{fmtDate(n.publish_date ?? undefined)}</Text>
            {n.short_description ? <Text style={[styles.para, styles.lead]}>{n.short_description}</Text> : null}
            {plainText(n.content)
              .split(/\n\s*\n/)
              .filter(Boolean)
              .map((p, i) => (
                <Text key={i} style={styles.para}>{p}</Text>
              ))}
            {(n.highlights ?? []).map((h, i) => (
              <View key={i} style={{ marginBottom: spacing.md }}>
                <Text style={s.name}>{h.title}</Text>
                <Text style={s.bodyMuted}>{h.description}</Text>
              </View>
            ))}
            <View style={styles.quote}>
              <Text style={styles.quoteText}>Home That Comes With More</Text>
              <Text style={s.caption}>COUNTY GREEN · NEW CHANDIGARH</Text>
            </View>
            {related.length ? (
              <>
                <SectionLabel style={{ marginTop: spacing.xl }}>Related Updates</SectionLabel>
                {related.map((r) => (
                  <Pressable key={r.id} onPress={() => router.push(`/news/${r.id}`)} style={styles.related} testID={`related-${r.id}`}>
                    <Image source={imageSource(r.image_url)} style={styles.relatedImg} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={s.name} numberOfLines={2}>{r.title}</Text>
                      <Text style={s.meta}>{label(NEWS_CATEGORIES, r.category)} · {fmtDate(r.publish_date ?? undefined)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                  </Pressable>
                ))}
              </>
            ) : null}
          </View>
        </ScrollView>
      )}
      <BottomNav />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  hero: { height: 300, backgroundColor: colors.forestDeep },
  heroTop: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.lg },
  circle: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  heroText: { flex: 1, justifyContent: "flex-end", padding: spacing.lg },
  title: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.onSurface, marginTop: spacing.lg },
  para: { fontFamily: fonts.body, fontSize: 15, lineHeight: 25, color: colors.onSurface, marginBottom: spacing.lg },
  lead: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 26 },
  quote: { borderLeftWidth: 3, borderLeftColor: colors.brandSecondary, paddingLeft: 16, paddingVertical: 4, marginVertical: spacing.sm },
  quoteText: { fontFamily: fonts.displayItalic, fontSize: 26, color: colors.brandPrimary, marginBottom: 4 },
  related: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  relatedImg: { width: 64, height: 64, borderRadius: radius.sm, backgroundColor: colors.forestSoft },
}));
