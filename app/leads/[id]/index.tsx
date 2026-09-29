import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get } from "@/src/api";
import { Timeline } from "@/src/components/sections";
import { Avatar, Badge, Button, Card, ErrorState, Header, InfoRow, Loading, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { fmtDate } from "@/src/format";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

// Screen · Lead Detail (single consolidated screen)
export default function LeadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const lead = useQuery({ queryKey: ["lead", id], queryFn: () => get(`/leads/${id}`) });
  const l = lead.data;

  return (
    <View style={s.screen} testID="lead-detail-screen">
      <Header title="Lead Detail" />
      {lead.isLoading ? <Loading /> : lead.isError || !l ? <ErrorState message={(lead.error as Error)?.message ?? "Lead not found"} onRetry={lead.refetch} /> : (
        <>
          <ScrollView contentContainerStyle={[s.content, { paddingBottom: 120 }]} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInUp.duration(400)} style={styles.headerCard}>
              <View style={[s.row, { gap: 14 }]}>
                <Avatar name={l.full_name} size={60} tone="gold" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} testID="lead-name">{l.full_name}</Text>
                  <Text style={styles.sub}>{l.category} · via {l.source}</Text>
                  <View style={[s.row, { gap: 6, marginTop: 8, flexWrap: "wrap" }]}>
                    <Badge label={l.status} small />
                    <Badge label={l.temperature} small />
                  </View>
                </View>
              </View>
              <View style={styles.headerMeta}>
                <View><Text style={styles.metaLabel}>NEXT FOLLOW-UP</Text><Text style={styles.metaValue}>{l.follow_up_date || "—"}{l.follow_up_time ? ` · ${l.follow_up_time}` : ""}</Text></View>
                <View style={{ alignItems: "flex-end" }}><Text style={styles.metaLabel}>LAST UPDATED</Text><Text style={styles.metaValue}>{fmtDate(l.updated_at)}</Text></View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(90).duration(400)}>
              <SectionLabel style={{ marginTop: spacing.xl }}>Customer Details</SectionLabel>
              <Card>
                <InfoRow icon="call-outline" label="Mobile" value={l.mobile} />
                <InfoRow icon="mail-outline" label="Email" value={l.email} />
                <InfoRow icon="location-outline" label="Address" value={[l.address, l.city, l.state].filter(Boolean).join(", ")} />
                <InfoRow icon="calendar-clear-outline" label="Lead created" value={fmtDate(l.created_at)} />
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(160).duration(400)}>
              <SectionLabel style={{ marginTop: spacing.xl }}>Property Requirement</SectionLabel>
              <Card>
                <InfoRow icon="home-outline" label="Project" value={l.project} />
                <InfoRow icon="grid-outline" label="Configuration" value={l.configuration} />
                <InfoRow icon="cash-outline" label="Budget" value={l.budget} />
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(230).duration(400)}>
              <SectionLabel style={{ marginTop: spacing.xl }}>Follow-up & Notes</SectionLabel>
              <Card>
                <InfoRow icon="flag-outline" label="Next action" value={l.next_action} />
                <InfoRow icon="chatbox-ellipses-outline" label="Notes" value={l.notes} />
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(300).duration(400)}>
              <SectionLabel style={{ marginTop: spacing.xl }}>Activity History</SectionLabel>
              <Card><Timeline items={l.history ?? []} /></Card>
            </Animated.View>
          </ScrollView>
          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <Button label="Update lead" icon="create-outline" onPress={() => router.push(`/leads/${id}/update`)} testID="lead-update-button" />
          </View>
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  headerCard: { backgroundColor: colors.surfaceInverse, borderRadius: radius.lg, padding: spacing.lg, shadowColor: colors.forestDeep, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  name: { fontFamily: fonts.display, fontSize: 26, color: colors.onImage },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.onImageMuted, marginTop: 2 },
  headerMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)" },
  metaLabel: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1.4, color: colors.brandSecondary },
  metaValue: { fontFamily: fonts.medium, fontSize: 14, color: colors.onImage, marginTop: 2 },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
}));
