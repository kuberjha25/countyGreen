import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get } from "@/src/api";
import { BottomNav, ErrorState, Header, Loading, ScreenTitle, useScreenStyles } from "@/src/components/ui";
import { fonts, makeStyles, spacing } from "@/src/theme";

// Screen 27 · Terms & Conditions
export default function Terms() {
  const s = useScreenStyles();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const terms = useQuery({ queryKey: ["content", "terms"], queryFn: () => get("/content/terms") });
  const t = terms.data;
  return (
    <View style={s.screen} testID="terms-screen">
      <Header title="Terms & Conditions" showBell={false} />
      {terms.isLoading ? <Loading /> : terms.isError || !t ? <ErrorState message={(terms.error as Error)?.message ?? "Failed"} onRetry={terms.refetch} /> : (
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 32, paddingTop: 8 }]} showsVerticalScrollIndicator={false}>
          <ScreenTitle title={t.title} subtitle="Please read these terms and conditions carefully before using the County Green partner app and services." />
          <Text style={styles.updated}>LAST UPDATED · {t.updated}</Text>
          {t.sections.map((sec: any) => (
            <View key={sec.title} style={{ marginBottom: spacing.xl }}>
              <Text style={styles.h}>{sec.title}</Text>
              <Text style={styles.p}>{sec.body}</Text>
            </View>
          ))}
          <Text style={s.caption}>For questions about these terms, contact the County Green partner desk.</Text>
        </ScrollView>
      )}
      <BottomNav />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  updated: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.6, color: colors.brandSecondary, marginBottom: spacing.xl },
  h: { fontFamily: fonts.displaySemi, fontSize: 20, color: colors.onSurface, marginBottom: 8 },
  p: { fontFamily: fonts.body, fontSize: 14, lineHeight: 23, color: colors.onSurfaceTertiary },
}));
