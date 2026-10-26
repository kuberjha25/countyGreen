import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { imageSource } from "@/src/brand";
import { Badge, BottomNav, ChipRow, EmptyState, ErrorState, Header, Loading, useScreenStyles } from "@/src/components/ui";
import { fmtDate } from "@/src/format";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchNews } from "@/src/store/contentSlice";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { label, NEWS_CATEGORIES } from "@/src/types";

const ALL = "All";
const CATS = [ALL, ...Object.values(NEWS_CATEGORIES)];

// Screen 23 · News Feed (GET /api/news — category: projects | construction_updates | offers | events).
export default function News() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const news = useAppSelector((st) => st.content.news);
  const [cat, setCat] = useState(ALL);
  const category = Object.keys(NEWS_CATEGORIES).find((k) => NEWS_CATEGORIES[k] === cat);
  const load = useCallback((page = 1) => dispatch(fetchNews({ params: { category }, page })), [dispatch, category]);
  useEffect(() => {
    load(1);
  }, [load]);
  const [featured, ...rest] = news.items;
  const more = news.page < news.lastPage;

  return (
    <View style={s.screen} testID="news-screen">
      <Header title="News Feed" />
      <View style={[s.content, { paddingBottom: 4 }]}>
        <Text style={[s.h2, { fontSize: 30 }]}>Latest from County Green</Text>
        <Text style={s.bodyMuted}>Projects, construction updates, offers and events.</Text>
      </View>
      <ChipRow options={CATS} value={cat} onChange={setCat} testIDPrefix="news-cat" />
      {news.status === "loading" && !news.items.length ? <Loading /> : news.status === "failed" && !news.items.length ? <ErrorState message={news.error ?? "Could not load news"} onRetry={() => load(1)} /> : (
        <FlatList
          data={rest}
          keyExtractor={(n) => String(n.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 24, gap: 10 }}
          refreshControl={<RefreshControl refreshing={news.status === "loading" && !!news.items.length} onRefresh={() => load(1)} tintColor={colors.brandPrimary} />}
          onEndReachedThreshold={0.4}
          onEndReached={() => more && !news.loadingMore && load(news.page + 1)}
          ListFooterComponent={news.loadingMore ? <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: 8 }} /> : null}
          ListEmptyComponent={!featured ? <EmptyState icon="newspaper-outline" title="No updates yet" body="News and announcements will appear here." /> : null}
          ListHeaderComponent={featured ? (
            <Pressable onPress={() => router.push(`/news/${featured.id}`)} style={styles.featured} testID={`news-featured-${featured.id}`}>
              <Image source={imageSource(featured.image_url)} style={styles.fill} contentFit="cover" />
              <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.fill} />
              <View style={styles.featuredText}>
                <Badge label={label(NEWS_CATEGORIES, featured.category)} tone="gold" small />
                <Text style={styles.featuredTitle} numberOfLines={2}>{featured.title}</Text>
                <Text style={styles.featuredMeta}>{fmtDate(featured.publish_date ?? undefined)}</Text>
              </View>
            </Pressable>
          ) : null}
          renderItem={({ item: n }) => (
            <Pressable onPress={() => router.push(`/news/${n.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} testID={`news-card-${n.id}`}>
              <Image source={imageSource(n.image_url)} style={styles.cardImg} contentFit="cover" />
              <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.cardImg} />
              <View style={styles.cardText}>
                <Badge label={label(NEWS_CATEGORIES, n.category)} small />
                <Text style={styles.cardTitle} numberOfLines={3}>{n.title}</Text>
                <Text style={styles.cardMeta}>{fmtDate(n.publish_date ?? undefined)}</Text>
              </View>
            </Pressable>
          )}
        />
      )}
      <BottomNav />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  featured: { height: 240, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.forestDeep, marginBottom: 2 },
  featuredText: { flex: 1, justifyContent: "flex-end", padding: spacing.lg, gap: 6 },
  featuredTitle: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.onImage },
  featuredMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.onImageMuted },
  card: { flex: 1, height: 200, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.forestDeep },
  cardImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  cardText: { flex: 1, justifyContent: "flex-end", padding: 12, gap: 6 },
  cardTitle: { fontFamily: fonts.displaySemi, fontSize: 16, lineHeight: 20, color: colors.onImage },
  cardMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.onImageMuted },
}));
