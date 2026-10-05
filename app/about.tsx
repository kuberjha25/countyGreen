import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get } from "@/src/api";
import { BRAND, img, LOGO } from "@/src/brand";
import { BottomNav, Button, Card, ErrorState, Header, Loading, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

// Screen 28 · About Us
export default function About() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const about = useQuery({ queryKey: ["content", "about"], queryFn: () => get("/content/about") });
  const a = about.data;

  return (
    <View style={s.screen} testID="about-screen">
      <Header title="About Us" />
      {about.isLoading ? <Loading /> : about.isError || !a ? <ErrorState message={(about.error as Error)?.message ?? "Failed"} onRetry={about.refetch} /> : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
          <View style={styles.logoWrap}>
            <Image source={LOGO} style={{ width: 170, height: 150 }} contentFit="contain" />
            <Text style={styles.tag}>{a.subtitle}</Text>
            <Text style={styles.eyebrow}>{BRAND.status.toUpperCase()} · {BRAND.location.toUpperCase()}</Text>
          </View>
          <View style={s.content}>
            <View style={styles.hero}>
              <Image source={img(a.hero_image)} style={styles.fill} contentFit="cover" />
              <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.fill} />
              <View style={styles.heroText}>
                <Text style={styles.heroQuote}>Close to the city,{"\n"}away from its chaos</Text>
              </View>
            </View>

            <SectionLabel style={{ marginTop: spacing.xl }}>Our Story</SectionLabel>
            <Text style={styles.story}>{a.story}</Text>

            <SectionLabel style={{ marginTop: spacing.xl }}>What We Stand For</SectionLabel>
            <View style={{ gap: 10 }}>
              {a.pillars.map((p: any, i: number) => (
                <Card key={p.title} style={{ flexDirection: "row", gap: 14 }} testID={`pillar-${i}`}>
                  <View style={styles.pillarIcon}><Ionicons name={(["sparkles-outline", "trophy-outline", "leaf-outline"] as const)[i % 3]} size={18} color={colors.brandSecondary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.h3}>{p.title}</Text>
                    <Text style={[s.bodyMuted, { marginTop: 4 }]}>{p.body}</Text>
                  </View>
                </Card>
              ))}
            </View>

            <SectionLabel style={{ marginTop: spacing.xl }}>Life at County Greens</SectionLabel>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {a.images.map((k: string) => <Image key={k} source={img(k)} style={styles.grid} contentFit="cover" />)}
            </View>

            <SectionLabel style={{ marginTop: spacing.xl }}>Key Highlights</SectionLabel>
            <Card>
              {a.highlights.map((h: string, i: number) => (
                <View key={h} style={[s.row, { gap: 10, paddingVertical: 8 }, i > 0 && { borderTopWidth: 1, borderTopColor: colors.divider }]}>
                  <Ionicons name="checkmark-circle" size={18} color={colors.brandTertiary} />
                  <Text style={[s.body, { fontSize: 14, flex: 1 }]}>{h}</Text>
                </View>
              ))}
            </Card>

            <View style={styles.note}>
              <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
              <Text style={styles.noteText}>{a.company_note}</Text>
            </View>

            <Button label="Explore the project" icon="arrow-forward" onPress={() => router.push("/project")} style={{ marginTop: spacing.xl }} testID="about-project-button" />
            <Pressable onPress={() => router.push("/terms")} style={{ alignSelf: "center", marginTop: spacing.lg, minHeight: 44, justifyContent: "center" }} testID="about-terms-link"><Text style={s.link}>Terms & Conditions</Text></Pressable>
          </View>
        </ScrollView>
      )}
      <BottomNav />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  logoWrap: { alignItems: "center", paddingVertical: spacing.lg },
  tag: { fontFamily: fonts.displayItalic, fontSize: 26, color: colors.brandPrimary, marginTop: 4 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 2.4, color: colors.brandSecondary, marginTop: 8 },
  hero: { height: 220, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.forestDeep },
  heroText: { flex: 1, justifyContent: "flex-end", padding: spacing.lg },
  heroQuote: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, color: colors.onImage },
  story: { fontFamily: fonts.body, fontSize: 15, lineHeight: 25, color: colors.onSurface },
  pillarIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceInverse, alignItems: "center", justifyContent: "center" },
  grid: { width: "48%", flexGrow: 1, height: 140, borderRadius: radius.md },
  note: { flexDirection: "row", gap: 8, marginTop: spacing.lg, padding: 12, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary },
  noteText: { flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted },
}));
