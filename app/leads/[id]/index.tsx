import Ionicons from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { errorMessage } from "@/src/api";
import { useCan } from "@/src/auth";
import { Timeline } from "@/src/components/sections";
import { Avatar, Badge, BottomNav, BottomSheet, Button, Card, ChoiceChips, COMING_SOON, ErrorState, Field, Header, InfoRow, Loading, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { fmtDate } from "@/src/format";
import { useLeadStatuses } from "@/src/lookups";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { completeFollowup, fetchLead, updateLeadStatus } from "@/src/store/leadsSlice";
import { fetchLeadStatuses } from "@/src/store/lookupsSlice";
import { useRun } from "@/src/store/useRun";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";
import { isMasked, label, LEAD_SETTABLE_STATUSES, LEAD_STATUS_LABEL, LeadSettableStatus } from "@/src/types";

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
  const statuses = useLeadStatuses();
  const [run, saving] = useRun();
  const [statusOpen, setStatusOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<LeadSettableStatus | "">("");
  const [statusRemarks, setStatusRemarks] = useState("");
  const [completing, setCompleting] = useState<number | null>(null);
  const [doneRemarks, setDoneRemarks] = useState("");
  const [sheetErr, setSheetErr] = useState<string | undefined>();

  // Options from GET /api/leads/statuses ({ id: slug, name }), limited to what PATCH accepts;
  // the fixed list is the fallback while it loads or if it fails / comes back empty.
  const settable = (statuses.data ?? []).filter((o): o is { id: LeadSettableStatus; name: string } => (LEAD_SETTABLE_STATUSES as readonly string[]).includes(String(o.id)));
  const statusOptions = settable.length ? settable : LEAD_SETTABLE_STATUSES.map((k) => ({ id: k, name: label(LEAD_STATUS_LABEL, k) }));
  const remarksTooShort = statusRemarks.trim().length < 3;

  // PATCH /api/leads/{id}/status { status, remarks } — remarks required (min 3 characters).
  const saveStatus = async () => {
    if (!newStatus) return setSheetErr("Select the new status");
    if (remarksTooShort) return setSheetErr("Remarks must be at least 3 characters");
    try {
      await run(updateLeadStatus({ id: Number(id), status: newStatus, remarks: statusRemarks.trim() }));
      setStatusOpen(false);
      toast.show("Lead status updated", "success");
    } catch (e) {
      setSheetErr(errorMessage(e));
    }
  };

  const saveComplete = async () => {
    if (completing === null) return;
    if (!doneRemarks.trim()) return setSheetErr("Add completion remarks");
    try {
      const r = await run<{ message?: string }>(completeFollowup({ id: Number(id), followupId: completing, remarks: doneRemarks.trim() }));
      setCompleting(null);
      toast.show(r?.message || "Follow-up marked as completed", "success");
    } catch (e) {
      setSheetErr(errorMessage(e));
    }
  };

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
                  <Button label="Request documents" icon="document-attach-outline" variant="secondary" small onPress={() => router.push({ pathname: "/requests/new", params: { leadName: l.full_name, leadMobile: l.mobile } })} style={{ marginTop: spacing.md }} testID="request-documents-button" />
                </Card>
              </>
            ) : null}

            <SectionLabel style={{ marginTop: spacing.xl }}>Activity History</SectionLabel>
            <Card>
              <Timeline
                items={(l.history ?? []).map((h, i) => {
                  const task = h.type === "task" && h.id !== undefined;
                  return {
                    title: h.activity,
                    at: h.time ? `${h.date}T${h.time}` : h.date,
                    detail: [h.remarks, h.user_name && `by ${h.user_name}`].filter(Boolean).join(" · ") || undefined,
                    badge: task ? <Badge label={h.is_completed ? "Completed" : "Pending"} tone={h.is_completed ? "success" : "warning"} small /> : undefined,
                    footer: !task ? undefined : h.is_completed ? (
                      h.completion_remarks ? <Text style={[s.caption, { marginTop: 4 }]}>{h.completion_remarks}</Text> : undefined
                    ) : staff ? (
                      <Button label="Mark complete" icon="checkmark-done-outline" variant="secondary" small onPress={() => { setDoneRemarks(""); setSheetErr(undefined); setCompleting(h.id!); }} style={{ marginTop: 8, alignSelf: "flex-start" }} testID={`followup-complete-${h.id ?? i}`} />
                    ) : undefined,
                  };
                })}
              />
            </Card>

            {staff ? (
              <>
                <SectionLabel style={{ marginTop: spacing.xl }}>Manage Lead</SectionLabel>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  <Button label="Update status" icon="flag-outline" variant="secondary" small onPress={() => { setNewStatus(""); setStatusRemarks(""); setSheetErr(undefined); setStatusOpen(true); }} style={{ flexGrow: 1 }} testID="lead-status-button" />
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

          <BottomSheet visible={statusOpen} onClose={() => setStatusOpen(false)} title="Update status" subtitle={`Currently ${label(LEAD_STATUS_LABEL, l.status)}`} testID="lead-status-sheet">
            {statuses.status === "failed" ? <ErrorState message={statuses.error ?? "Could not load statuses"} onRetry={() => dispatch(fetchLeadStatuses())} /> : null}
            <ChoiceChips label="New status" value={statusOptions.find((o) => o.id === newStatus)?.name} options={statusOptions.map((o) => o.name)} onChange={(name) => { setSheetErr(undefined); setNewStatus(statusOptions.find((o) => o.name === name)?.id ?? ""); }} testID="lead-status-options" />
            <Field label="Remarks" placeholder="Why is the status changing? (min 3 characters)" value={statusRemarks} onChangeText={(v) => { setSheetErr(undefined); setStatusRemarks(v); }} multiline maxLength={500} error={sheetErr} testID="lead-status-remarks" />
            <Button label="Save status" variant="gold" onPress={saveStatus} loading={saving} testID="lead-status-save" />
            <Button label="Cancel" variant="ghost" small onPress={() => setStatusOpen(false)} style={{ marginTop: 8 }} testID="lead-status-cancel" />
          </BottomSheet>

          <BottomSheet visible={completing !== null} onClose={() => setCompleting(null)} title="Mark follow-up complete" subtitle="Add what happened on this follow-up." testID="followup-complete-sheet">
            <Field label="Completion remarks" placeholder="e.g. Client answered, wants to visit next week" value={doneRemarks} onChangeText={setDoneRemarks} multiline error={sheetErr} testID="followup-complete-remarks" />
            <Button label="Mark complete" variant="gold" onPress={saveComplete} loading={saving} testID="followup-complete-save" />
            <Button label="Cancel" variant="ghost" small onPress={() => setCompleting(null)} style={{ marginTop: 8 }} testID="followup-complete-cancel" />
          </BottomSheet>
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
