import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get } from "@/src/api";
import { img } from "@/src/brand";
import { Badge, BottomNav, ChipRow, EmptyState, ErrorState, Header, Loading, useScreenStyles } from "@/src/components/ui";
import { fmtDate } from "@/src/format";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const CATS = ["All", "Project Updates", "Announcements", "Marketing", "Events"];

// Screen 23 · News Feed
export default function News() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [cat, setCat] = useState("All");
  const news = useQuery({ queryKey: ["news"], queryFn: () => get<any[]>("/news") });
  const list = (news.data ?? []).filter((n) => cat === "All" || n.category === cat);
  const [featured, ...rest] = list;

  return (
    <View style={s.screen} testID="news-screen">
      <Header title="News Feed" />
      <View style={[s.content, { paddingBottom: 4 }]}>
        <Text style={[s.h2, { fontSize: 30 }]}>Latest from County Greens</Text>
        <Text style={s.bodyMuted}>Project updates, announcements, events and marketing.</Text>
      </View>
      <ChipRow options={CATS} value={cat} onChange={setCat} testIDPrefix="news-cat" />
      {news.isLoading ? <Loading /> : news.isError ? <ErrorState message={(news.error as Error).message} onRetry={news.refetch} /> : (
        <FlatList
          data={rest}
          keyExtractor={(n) => n.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 24, gap: 10 }}
          refreshControl={<RefreshControl refreshing={news.isRefetching} onRefresh={news.refetch} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={!featured ? <EmptyState icon="newspaper-outline" title="No updates yet" body="News and announcements will appear here." /> : null}
          ListHeaderComponent={featured ? (
            <Pressable onPress={() => router.push(`/news/${featured.id}`)} style={styles.featured} testID={`news-featured-${featured.id}`}>
              <Image source={img(featured.image)} style={styles.fill} contentFit="cover" />
              <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.fill} />
              <View style={styles.featuredText}>
                <Badge label={featured.category} tone="gold" small />
                <Text style={styles.featuredTitle} numberOfLines={2}>{featured.title}</Text>
                <Text style={styles.featuredMeta}>{fmtDate(featured.published_at)} · {featured.read_time}</Text>
              </View>
            </Pressable>
          ) : null}
          renderItem={({ item: n }) => (
            <Pressable onPress={() => router.push(`/news/${n.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]} testID={`news-card-${n.id}`}>
              <Image source={img(n.image)} style={styles.cardImg} contentFit="cover" />
              <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.cardImg} />
              <View style={styles.cardText}>
                <Badge label={n.category} small />
                <Text style={styles.cardTitle} numberOfLines={3}>{n.title}</Text>
                <Text style={styles.cardMeta}>{fmtDate(n.published_at)}</Text>
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
