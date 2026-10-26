import Ionicons from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { useCan } from "@/src/auth";
import { Timeline } from "@/src/components/sections";
import { Avatar, Badge, BottomNav, Button, Card, COMING_SOON, ErrorState, Header, InfoRow, Loading, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { fmtDate } from "@/src/format";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchLead } from "@/src/store/leadsSlice";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";
import { isMasked, label, LEAD_STATUS_LABEL } from "@/src/types";

const rupees = (v?: string | null) => (v && /^\d+(\.\d+)?$/.test(v) ? `₹ ${Number(v).toLocaleString("en-IN")}` : v ?? undefined);

// Screen · Lead Detail (GET /api/leads/{id}). Partners see it view-only; staff can edit, follow up and schedule a visit.
export default function LeadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const can = useCan();
  const entry = useAppSelector((st) => st.leads.byId[Number(id)]);
  const l = entry?.data;

  useEffect(() => {
    if (!entry || entry.status === "idle") dispatch(fetchLead(Number(id)));
  }, [dispatch, id, entry]);

  const callable = !!l?.mobile && !isMasked(l.mobile);
  const converted = l?.status === "converted" || l?.status === "booked";
  const staff = can("leads", "edit");

  return (
    <View style={s.screen} testID="lead-detail-screen">
      <Header title="Lead Detail" />
      {!l ? (
        entry?.status === "failed" ? <ErrorState message={entry.error ?? "Lead not found"} onRetry={() => dispatch(fetchLead(Number(id)))} /> : <Loading />
      ) : (
        <>
          <ScrollView contentContainerStyle={[s.content, { paddingBottom: spacing.xl }]} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInUp.duration(400)} style={styles.headerCard}>
              <View style={[s.row, { gap: 14 }]}>
                <Avatar name={l.full_name} size={60} tone="gold" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} testID="lead-name">{l.full_name}</Text>
                  <Text style={styles.sub}>{[l.project_name, l.source && `via ${l.source}`].filter(Boolean).join(" · ")}</Text>
                  <View style={[s.row, { gap: 6, marginTop: 8, flexWrap: "wrap" }]}>
                    <Badge label={label(LEAD_STATUS_LABEL, l.status)} small />
                    {l.lead_type ? <Badge label={label({}, l.lead_type)} small /> : null}
                  </View>
                </View>
                {callable ? (
                  <Pressable onPress={() => Linking.openURL(`tel:${l.mobile}`)} style={styles.call} testID="lead-call-button">
                    <Ionicons name="call" size={18} color={colors.forestDeep} />
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.headerMeta}>
                <View><Text style={styles.metaLabel}>NEXT FOLLOW-UP</Text><Text style={styles.metaValue}>{l.next_follow_up && l.next_follow_up !== "Not scheduled" ? fmtDate(l.next_follow_up) : "Not scheduled"}</Text></View>
                <View style={{ alignItems: "flex-end" }}><Text style={styles.metaLabel}>SITE VISIT</Text><Text style={styles.metaValue}>{l.visit_date ? `${fmtDate(l.visit_date)}${l.visit_time ? ` · ${l.visit_time}` : ""}` : "—"}</Text></View>
              </View>
            </Animated.View>

            <SectionLabel style={{ marginTop: spacing.xl }}>Lead Ownership</SectionLabel>
            <Card>
              <InfoRow icon="person-circle-outline" label="Assigned County Green staff" value={l.assigned_to || "Not assigned yet"} testID="lead-assigned-staff" />
            </Card>

            <SectionLabel style={{ marginTop: spacing.xl }}>Customer Details</SectionLabel>
            <Card>
              <InfoRow icon="call-outline" label="Mobile" value={l.mobile} />
              <InfoRow icon="mail-outline" label="Email" value={l.email ?? undefined} />
              {l.address || l.city || l.state ? <InfoRow icon="location-outline" label="Address" value={[l.address, l.city, l.state].filter(Boolean).join(", ")} /> : null}
            </Card>

            <SectionLabel style={{ marginTop: spacing.xl }}>Property Requirement</SectionLabel>
            <Card>
              <InfoRow icon="home-outline" label="Project" value={l.project_name ?? undefined} />
              <InfoRow icon="grid-outline" label="Unit category" value={l.unit_category ?? undefined} />
              <InfoRow icon="cash-outline" label="Budget" value={rupees(l.budget)} />
              <InfoRow icon="git-branch-outline" label="Source" value={l.source ?? undefined} />
            </Card>

            {l.remarks ? (
              <>
                <SectionLabel style={{ marginTop: spacing.xl }}>Remarks</SectionLabel>
                <Card><Text style={s.body}>{l.remarks}</Text></Card>
              </>
            ) : null}

            {converted ? (
              <>
                <SectionLabel style={{ marginTop: spacing.xl }}>Document Requests (CRM)</SectionLabel>
                <Card>
                  <Text style={s.bodyMuted}>Need the booking form, allotment letter or receipts for this customer? Raise a request to the CRM team.</Text>
                  <Button label="Request documents" icon="document-attach-outline" variant="secondary" small onPress={() => toast.show(COMING_SOON, "info")} style={{ marginTop: spacing.md }} testID="request-documents-button" />
                </Card>
              </>
            ) : null}

            <SectionLabel style={{ marginTop: spacing.xl }}>Activity History</SectionLabel>
            <Card><Timeline items={(l.history ?? []).map((h) => ({ title: h.activity, detail: h.user_name ? `by ${h.user_name}` : undefined, at: h.date }))} /></Card>

            {staff ? (
              <>
                <SectionLabel style={{ marginTop: spacing.xl }}>Manage Lead</SectionLabel>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  <Button label="Edit details" icon="create-outline" variant="secondary" small onPress={() => router.push(`/leads/${id}/edit`)} style={{ flexGrow: 1 }} testID="lead-edit-button" />
                  <Button label="Reassign" icon="swap-horizontal-outline" variant="secondary" small onPress={() => toast.show(COMING_SOON, "info")} style={{ flexGrow: 1 }} testID="lead-reassign-button" />
                  <Button label="Delete" icon="trash-outline" variant="danger" small onPress={() => toast.show(COMING_SOON, "info")} style={{ flexGrow: 1 }} testID="lead-delete-button" />
                </View>
              </>
            ) : null}
          </ScrollView>
          {staff ? (
            <View style={styles.footer}>
              <Button label="Schedule visit" icon="calendar-outline" variant="secondary" onPress={() => router.push({ pathname: "/visits/new", params: { lead_id: String(l.id) } })} style={{ flex: 1 }} testID="lead-schedule-visit-button" />
              <Button label="Follow-up" icon="create-outline" onPress={() => router.push(`/leads/${id}/update`)} style={{ flex: 1 }} testID="lead-update-button" />
            </View>
          ) : null}
        </>
      )}
      <BottomNav active="leads" />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  headerCard: { backgroundColor: colors.surfaceInverse, borderRadius: radius.lg, padding: spacing.lg, shadowColor: colors.forestDeep, shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  name: { fontFamily: fonts.display, fontSize: 26, color: colors.onImage },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.onImageMuted, marginTop: 2 },
  call: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  headerMeta: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.lg, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.15)" },
  metaLabel: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1.4, color: colors.brandSecondary },
  metaValue: { fontFamily: fonts.medium, fontSize: 14, color: colors.onImage, marginTop: 2 },
  footer: { flexDirection: "row", gap: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
}));
