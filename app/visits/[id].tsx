import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get, patch } from "@/src/api";
import { useCan } from "@/src/auth";
import { partnerShort } from "@/src/brand";
import { SectionTabs, Timeline } from "@/src/components/sections";
import { Avatar, Badge, BottomNav, Button, Card, ChoiceChips, ErrorState, Field, Header, InfoRow, Loading, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { maskedAadhaar, maskedMobile } from "@/src/format";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

const STATUSES = ["In Progress", "Attended"];

// Screen 17 · Project Visit Details (sections: Visit · Customer · Notes · History) + Update-status sheet.
// Partners see it view-only; staff actions follow their role permissions.
export default function VisitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const can = useCan();
  const visit = useQuery({ queryKey: ["visit", id], queryFn: () => get(`/visits/${id}`) });
  const v = visit.data;
  const [confirm, setConfirm] = useState(false);
  const [status, setStatus] = useState("Attended");
  const [notes, setNotes] = useState("");
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["visit", id] });
    qc.invalidateQueries({ queryKey: ["visits"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["mis"] });
  };

  const update = useMutation({
    mutationFn: () => patch(`/visits/${id}`, { status, notes: notes || undefined }),
    onSuccess: () => {
      refresh();
      setConfirm(false);
      setNotes("");
      toast.show(`Visit marked as ${status}`, "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });
  const footer = can("visits", "modify") || can("visits", "add");

  return (
    <View style={s.screen} testID="visit-detail-screen">
      <Header title="Project Visit Details" />
      {visit.isLoading ? <Loading /> : visit.isError || !v ? <ErrorState message={(visit.error as Error)?.message ?? "Not found"} onRetry={visit.refetch} /> : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }} showsVerticalScrollIndicator={false}>
            <View style={[s.content, { paddingBottom: 0 }]}>
              <View style={[s.row, { gap: 14, marginBottom: spacing.md }]}>
                <Avatar name={v.full_name} size={56} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.h2, { fontSize: 26 }]} testID="visit-name">{v.full_name}</Text>
                  <View style={[s.row, { gap: 6, marginTop: 6 }]}>
                    <Badge label={v.status === "In Progress" ? "Current Visit" : v.status} small />
                    <Badge label={v.visitor_type} tone="muted" small />
                  </View>
                </View>
                {v.mobile ? <Pressable onPress={() => Linking.openURL(`tel:${v.mobile.replace(/\s/g, "")}`)} style={styles.call} testID="visit-call-button"><Ionicons name="call" size={18} color={colors.onBrandPrimary} /></Pressable> : null}
              </View>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: spacing.sm }}>
                <Card style={{ flex: 1 }}><Text style={s.caption}>VISIT DATE</Text><Text style={styles.big}>{v.visit_date}</Text></Card>
                <Card style={{ flex: 1 }}><Text style={s.caption}>VISIT TIME</Text><Text style={styles.big}>{v.visit_time}</Text></Card>
              </View>
            </View>
            <SectionTabs sections={[
              { key: "visit", label: "Visit", icon: "calendar-outline", render: () => (
                <View style={s.content}>
                  <SectionLabel>Visit Information</SectionLabel>
                  <Card>
                    <InfoRow icon="home-outline" label="Project" value={v.project} />
                    <InfoRow icon="location-outline" label="Site" value="County Green, New Chandigarh" />
                    <InfoRow icon="flag-outline" label="Status" value={v.status} />
                    <InfoRow icon="person-outline" label="Visit for" value={v.partner_type ? `${v.partner_name} · ${partnerShort(v.partner_type)}` : "Direct (no partner)"} />
                    {v.created_by ? <InfoRow icon="create-outline" label="Scheduled by" value={v.created_by} /> : null}
                    <InfoRow icon="person-circle-outline" label="Assigned County Green staff" value={v.assigned_to || "Not assigned yet"} testID="visit-assigned-staff" />
                  </Card>
                  {v.lead_id ? <Button label="View related lead" icon="arrow-forward" variant="secondary" small onPress={() => router.push(`/leads/${v.lead_id}`)} style={{ marginTop: spacing.md }} testID="visit-view-lead-button" /> : null}
                </View>
              ) },
              { key: "customer", label: "Customer", icon: "person-outline", render: () => (
                <View style={s.content}>
                  <SectionLabel>Customer Information</SectionLabel>
                  <Card>
                    {v.partner_id ? (
                      <>
                        <InfoRow icon="call-outline" label="Mobile (last 4 digits)" value={maskedMobile(v.mobile_last4)} />
                        <InfoRow icon="card-outline" label="Aadhaar (last 4 digits)" value={maskedAadhaar(v.aadhaar_last4)} />
                      </>
                    ) : (
                      <InfoRow icon="call-outline" label="Mobile" value={v.mobile} />
                    )}
                    <InfoRow icon="mail-outline" label="Email" value={v.email} />
                    <InfoRow icon="location-outline" label="Address" value={[v.address, v.city, v.state].filter(Boolean).join(", ")} />
                    <InfoRow icon="pricetag-outline" label="Visitor type" value={v.visitor_type} />
                  </Card>
                </View>
              ) },
              { key: "notes", label: "Notes", icon: "document-text-outline", render: () => (
                <View style={s.content}>
                  <SectionLabel>Visit Notes</SectionLabel>
                  <Card><Text style={s.body}>{v.notes || "No notes added."}</Text></Card>
                  <SectionLabel style={{ marginTop: spacing.lg }}>Follow-up</SectionLabel>
                  <Card><Text style={s.body}>{v.follow_up || "No follow-up set."}</Text></Card>
                </View>
              ) },
              { key: "history", label: "History", icon: "list-outline", render: () => (
                <View style={s.content}>
                  <SectionLabel>Visit History</SectionLabel>
                  <Card><Timeline items={v.history ?? []} /></Card>
                </View>
              ) },
            ]} />
          </ScrollView>
          {footer ? (
            <View style={[styles.footer, { flexDirection: "row", gap: 10 }]}>
              {can("visits", "modify") ? (
                <Button label="Update status" icon="checkmark-done-outline" variant="gold" onPress={() => { setStatus(v.status === "In Progress" ? "Attended" : v.status); setConfirm(true); }} style={{ flex: 1 }} testID="end-visit-button" />
              ) : null}
              {can("visits", "add") && v.status !== "In Progress" && v.lead_id ? (
                <Button label="Schedule again" icon="calendar-outline" variant="secondary" onPress={() => router.push({ pathname: "/visits/new", params: { lead_id: v.lead_id } })} style={{ flex: 1 }} testID="schedule-again-button" />
              ) : null}
            </View>
          ) : null}
          <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => setConfirm(false)}>
            <Pressable style={styles.backdrop} onPress={() => setConfirm(false)}>
              <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}} testID="end-visit-sheet">
                <View style={styles.handle} />
                <Text style={styles.sheetTitle}>Update visit status</Text>
                <Text style={[s.bodyMuted, { marginBottom: spacing.lg }]}>The change is recorded in the visit history and the partner sees the new status.</Text>
                <ChoiceChips label="Status" value={status} options={STATUSES} onChange={setStatus} testID="visit-status" />
                <Field label="Visit notes (optional)" placeholder="What was discussed?" value={notes} onChangeText={setNotes} multiline testID="end-visit-notes" />
                <Button label="Save status" variant="gold" onPress={() => update.mutate()} loading={update.isPending} testID="confirm-end-visit" />
                <Button label="Cancel" variant="ghost" small onPress={() => setConfirm(false)} style={{ marginTop: 8 }} testID="cancel-end-visit" />
              </Pressable>
            </Pressable>
          </Modal>
        </>
      )}
      <BottomNav active="visits" />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  call: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  big: { fontFamily: fonts.displaySemi, fontSize: 20, color: colors.onSurface, marginTop: 2 },
  footer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  sheetTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.onSurface, marginBottom: 4 },
}));
