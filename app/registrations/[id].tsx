import Ionicons from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { Avatar, Badge, BottomNav, Card, ErrorState, Header, InfoRow, Loading, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchRegistration } from "@/src/store/registrationsSlice";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { label } from "@/src/types";

const val = (v?: string) => (v && v !== "N/A" ? v : undefined);

// Screen 10 · Registration Details (GET /api/registrations/{id} — display-ready, grouped).
export default function RegistrationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const entry = useAppSelector((st) => st.registrations.byId[Number(id)]);
  const r = entry?.data;

  useEffect(() => {
    if (!entry || entry.status === "idle") dispatch(fetchRegistration(Number(id)));
  }, [dispatch, id, entry]);

  const p = r?.personal_information ?? {};
  const b = r?.business_information ?? {};
  return (
    <View style={s.screen} testID="registration-detail-screen">
      <Header title="Registration Details" />
      {!r ? (
        entry?.status === "failed" ? <ErrorState message={entry.error ?? "Not found"} onRetry={() => dispatch(fetchRegistration(Number(id)))} /> : <Loading />
      ) : (
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: 24 }]} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(400)} style={styles.headerCard}>
            <View style={[s.row, { gap: 14 }]}>
              <Avatar name={p.full_name} size={60} tone="gold" />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} testID="registration-name">{p.full_name}</Text>
                <Text style={styles.sub}>{r.header.category}{val(b.company_name) ? ` · ${b.company_name}` : ""}</Text>
                <View style={[s.row, { gap: 6, marginTop: 8 }]}>
                  <Badge label={label({}, r.header.status.toLowerCase())} small />
                </View>
              </View>
            </View>
            <View style={styles.headerMeta}>
              <View><Text style={styles.metaLabel}>REGISTRATION ID</Text><Text style={styles.metaValue}>CG-REG-{String(id).padStart(4, "0")}</Text></View>
              <View style={{ alignItems: "flex-end" }}><Text style={styles.metaLabel}>SUBMITTED ON</Text><Text style={styles.metaValue}>{r.header.submitted_on}</Text></View>
            </View>
          </Animated.View>

          <SectionLabel style={{ marginTop: spacing.xl }}>Contact & Address</SectionLabel>
          <Card>
            <InfoRow icon="call-outline" label="Mobile" value={val(p.mobile_number)} />
            <InfoRow icon="mail-outline" label="Email" value={val(p.email_address)} />
            <InfoRow icon="location-outline" label="Address" value={[val(p.address), val(p.city), val(p.state)].filter(Boolean).join(", ")} />
          </Card>

          {Object.values(b).some(val) ? (
            <>
              <SectionLabel style={{ marginTop: spacing.xl }}>Business Information</SectionLabel>
              <Card>
                <InfoRow icon="business-outline" label="Company / Firm" value={val(b.company_name)} />
                <InfoRow icon="git-network-outline" label="Business type" value={val(b.business_type)} />
                {val(b.gst_number) ? <InfoRow icon="receipt-outline" label="GST number" value={b.gst_number} /> : null}
                {val(b.pan_number) ? <InfoRow icon="card-outline" label="PAN" value={b.pan_number} /> : null}
                {val(b.msme_number) ? <InfoRow icon="ribbon-outline" label="MSME / Udyam" value={b.msme_number} /> : null}
              </Card>
            </>
          ) : null}

          <SectionLabel style={{ marginTop: spacing.xl }}>Documents</SectionLabel>
          <Card>
            {(r.documents_submitted ?? []).length ? (
              (r.documents_submitted ?? []).map((d) => (
                <Pressable key={d.id} onPress={() => Linking.openURL(d.file_url)} style={[s.between, { paddingVertical: 8, gap: 10 }]} testID={`registration-doc-${d.id}`}>
                  <Ionicons name="document-text-outline" size={18} color={colors.brandPrimary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.body, { fontSize: 14 }]}>{d.name}</Text>
                    <Text style={s.caption} numberOfLines={1}>{d.original_name}</Text>
                  </View>
                  <Badge label={d.status} tone={/verified|approved/i.test(d.status) ? "success" : "warning"} small />
                </Pressable>
              ))
            ) : (
              <Text style={s.bodyMuted}>No documents uploaded.</Text>
            )}
          </Card>
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
}));
