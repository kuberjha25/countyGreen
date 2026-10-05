import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { get } from "@/src/api";
import { RERA_CERTIFICATE, partnerProfile } from "@/src/brand";
import { Avatar, Badge, BottomNav, Button, Card, ErrorState, Header, InfoRow, Loading, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { fmtDate } from "@/src/format";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const SOCIAL = [
  { key: "facebook", label: "Facebook", icon: "logo-facebook" },
  { key: "instagram", label: "Instagram", icon: "logo-instagram" },
  { key: "youtube", label: "YouTube", icon: "logo-youtube" },
] as const;

// Screen 10 · Registration Details (single consolidated screen)
export default function RegistrationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const reg = useQuery({ queryKey: ["registration", id], queryFn: () => get(`/registrations/${id}`) });
  const r = reg.data;
  const profile = partnerProfile(r?.category);
  const rera = (r?.documents ?? []).find((d: any) => d.type === RERA_CERTIFICATE);

  return (
    <View style={s.screen} testID="registration-detail-screen">
      <Header title="Registration Details" />
      {reg.isLoading ? <Loading /> : reg.isError || !r ? <ErrorState message={(reg.error as Error)?.message ?? "Not found"} onRetry={reg.refetch} /> : (
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: 24 }]} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(400)} style={styles.headerCard}>
            <View style={[s.row, { gap: 14 }]}>
              <Avatar name={`${r.first_name} ${r.last_name}`} size={60} tone="gold" />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} testID="registration-name">{r.first_name} {r.last_name}</Text>
                <Text style={styles.sub}>{r.category} · {r.company || "Independent"}</Text>
                <View style={[s.row, { gap: 6, marginTop: 8 }]}>
                  <Badge label={r.status} small />
                  <Badge label={r.project} tone="gold" small />
                </View>
              </View>
            </View>
            <View style={styles.headerMeta}>
              <View><Text style={styles.metaLabel}>REGISTRATION NO.</Text><Text style={styles.metaValue}>{r.registration_no}</Text></View>
              <View style={{ alignItems: "flex-end" }}><Text style={styles.metaLabel}>REGISTERED ON</Text><Text style={styles.metaValue}>{fmtDate(r.created_at)}</Text></View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(100).duration(400)}>
            <SectionLabel style={{ marginTop: spacing.xl }}>Contact & Address</SectionLabel>
            <Card>
              <InfoRow icon="call-outline" label="Phone" value={r.mobile} />
              <InfoRow icon="mail-outline" label="Email" value={r.email} />
              <InfoRow icon="location-outline" label="Address" value={[r.address, r.city, r.state, r.pincode].filter(Boolean).join(", ")} />
            </Card>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(180).duration(400)}>
            <SectionLabel style={{ marginTop: spacing.xl }}>Professional Details</SectionLabel>
            <Card>
              <InfoRow icon="pricetag-outline" label="Category" value={r.category} />
              {profile.entityLabel ? <InfoRow icon="business-outline" label="Company / Firm" value={r.company} /> : null}
              {profile.rera ? <InfoRow icon="ribbon-outline" label="RERA certificate" value={rera ? `Uploaded · ${rera.status}` : "Not uploaded"} /> : null}
              {r.notes ? <InfoRow icon="chatbox-ellipses-outline" label="Notes" value={r.notes} /> : null}
            </Card>
          </Animated.View>

          {profile.social ? (
          <Animated.View entering={FadeInUp.delay(260).duration(400)}>
            <SectionLabel style={{ marginTop: spacing.xl }}>Social Media</SectionLabel>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {SOCIAL.map((so) => {
                const url = r.social?.[so.key];
                return (
                  <Pressable key={so.key} disabled={!url} onPress={() => url && Linking.openURL(url)} style={({ pressed }) => [styles.social, !url && { opacity: 0.45 }, pressed && { transform: [{ scale: 0.97 }] }]} testID={`social-${so.key}`}>
                    <View style={styles.socialIcon}><Ionicons name={so.icon} size={20} color={colors.onImage} /></View>
                    <Text style={styles.socialLabel}>{so.label}</Text>
                    <Text style={s.caption}>{url ? "Open profile" : "Not linked"}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
          ) : null}

          <Button label="Project overview" variant="secondary" icon="home-outline" onPress={() => router.push("/project")} style={{ marginTop: spacing.xl }} testID="registration-project-button" />
        </ScrollView>
      )}
      <BottomNav />
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
  social: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, shadowColor: colors.forestDeep, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  socialIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  socialLabel: { fontFamily: fonts.semibold, fontSize: 12, color: colors.onSurface },
}));
