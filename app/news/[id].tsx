import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get } from "@/src/api";
import { img } from "@/src/brand";
import { Badge, BottomNav, ErrorState, Loading, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { fmtDate } from "@/src/format";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

// Screen 24 · News Article
export default function Article() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const item = useQuery({ queryKey: ["news", id], queryFn: () => get(`/news/${id}`) });
  const n = item.data;

  return (
    <View style={s.screen} testID="article-screen">
      {item.isLoading ? <Loading /> : item.isError || !n ? <ErrorState message={(item.error as Error)?.message ?? "Not found"} onRetry={item.refetch} /> : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Image source={img(n.image)} style={styles.fill} contentFit="cover" />
            <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.fill} />
            <View style={[styles.heroTop, { paddingTop: insets.top + 6 }]}>
              <Pressable onPress={() => router.back()} style={styles.circle} testID="article-back-button"><Ionicons name="arrow-back" size={20} color={colors.onSurface} /></Pressable>
              <Pressable onPress={() => Share.share({ message: `${n.title} — County Green` })} style={styles.circle} testID="article-share-button"><Ionicons name="share-social-outline" size={18} color={colors.onSurface} /></Pressable>
            </View>
            <View style={styles.heroText}>
              <Badge label={n.category} tone="gold" small />
            </View>
          </View>
          <View style={s.content}>
            <Text style={styles.title} testID="article-title">{n.title}</Text>
            <View style={[s.row, { gap: 8, marginTop: 10, marginBottom: spacing.xl }]}>
              <Text style={s.caption}>{fmtDate(n.published_at)}</Text>
              <View style={styles.dot} />
              <Text style={s.caption}>{n.read_time}</Text>
              <View style={styles.dot} />
              <Text style={s.caption}>{n.author}</Text>
            </View>
            {String(n.body).split("\n\n").map((p: string, i: number) => (
              <Text key={i} style={[styles.para, i === 0 && styles.lead]}>{p}</Text>
            ))}
            <View style={styles.quote}>
              <Text style={styles.quoteText}>Home That Comes With More</Text>
              <Text style={s.caption}>COUNTY GREEN · NEW CHANDIGARH</Text>
            </View>
            {n.related?.length ? (
              <>
                <SectionLabel style={{ marginTop: spacing.xl }}>Related Updates</SectionLabel>
                {n.related.map((r: any) => (
                  <Pressable key={r.id} onPress={() => router.push(`/news/${r.id}`)} style={styles.related} testID={`related-${r.id}`}>
                    <Image source={img(r.image)} style={styles.relatedImg} contentFit="cover" />
                    <View style={{ flex: 1 }}>
                      <Text style={s.name} numberOfLines={2}>{r.title}</Text>
                      <Text style={s.meta}>{r.category} · {fmtDate(r.published_at)}</Text>
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
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.muted },
  para: { fontFamily: fonts.body, fontSize: 15, lineHeight: 25, color: colors.onSurface, marginBottom: spacing.lg },
  lead: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 26 },
  quote: { borderLeftWidth: 3, borderLeftColor: colors.brandSecondary, paddingLeft: 16, paddingVertical: 4, marginVertical: spacing.sm },
  quoteText: { fontFamily: fonts.displayItalic, fontSize: 26, color: colors.brandPrimary, marginBottom: 4 },
  related: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, marginBottom: 10 },
  relatedImg: { width: 64, height: 64, borderRadius: radius.sm },
}));
