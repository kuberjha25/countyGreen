import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get, patch } from "@/src/api";
import { useAuth } from "@/src/auth";
import { SectionTabs, Timeline } from "@/src/components/sections";
import { Avatar, Badge, BottomNav, Button, Card, ErrorState, Field, Header, InfoRow, Loading, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

// Screen 17 · Project Visit Details (sections: Visit · Customer · Notes · History) + End-visit confirmation sheet
export default function VisitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const visit = useQuery({ queryKey: ["visit", id], queryFn: () => get(`/visits/${id}`) });
  const v = visit.data;
  const [confirm, setConfirm] = useState(false);
  const [notes, setNotes] = useState("");

  const end = useMutation({
    mutationFn: () => patch(`/visits/${id}`, { status: "Attended", notes: notes || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["visit", id] });
      qc.invalidateQueries({ queryKey: ["visits"] });
      qc.invalidateQueries({ queryKey: ["mis"] });
      setConfirm(false);
      toast.show("Visit marked as attended", "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

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
                <Pressable onPress={() => Linking.openURL(`tel:${v.mobile.replace(/\s/g, "")}`)} style={styles.call} testID="visit-call-button"><Ionicons name="call" size={18} color={colors.onBrandPrimary} /></Pressable>
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
                    <InfoRow icon="location-outline" label="Site" value="County Greens, New Chandigarh" />
                    <InfoRow icon="flag-outline" label="Status" value={v.status} />
                    <InfoRow icon="person-outline" label="Booked by" value={`You (${v.booked_by ?? user?.partner_type ?? "Channel Partner"})`} />
                    <InfoRow icon="person-circle-outline" label="Assigned County Greens staff" value={v.assigned_to || "Not assigned yet"} testID="visit-assigned-staff" />
                  </Card>
                  {v.lead_id ? <Button label="View related lead" icon="arrow-forward" variant="secondary" small onPress={() => router.push(`/leads/${v.lead_id}`)} style={{ marginTop: spacing.md }} testID="visit-view-lead-button" /> : null}
                </View>
              ) },
              { key: "customer", label: "Customer", icon: "person-outline", render: () => (
                <View style={s.content}>
                  <SectionLabel>Customer Information</SectionLabel>
                  <Card>
                    <InfoRow icon="call-outline" label="Mobile" value={v.mobile} />
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
          <View style={styles.footer}>
            {v.status === "In Progress" ? (
              <Button label="End current visit" icon="checkmark-done-outline" variant="gold" onPress={() => setConfirm(true)} testID="end-visit-button" />
            ) : (
              <Button label="Schedule another visit" icon="calendar-outline" onPress={() => router.push({ pathname: "/visits/new", params: { name: v.full_name, mobile: v.mobile } })} testID="schedule-again-button" />
            )}
          </View>
          <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => setConfirm(false)}>
            <Pressable style={styles.backdrop} onPress={() => setConfirm(false)}>
              <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}} testID="end-visit-sheet">
                <View style={styles.handle} />
                <Text style={styles.sheetTitle}>End this visit?</Text>
                <Text style={[s.bodyMuted, { marginBottom: spacing.lg }]}>The visit will be marked as Attended and added to the customer{"'"}s history.</Text>
                <Field label="Visit notes (optional)" placeholder="What was discussed?" value={notes} onChangeText={setNotes} multiline testID="end-visit-notes" />
                <Button label="Confirm & end visit" variant="gold" onPress={() => end.mutate()} loading={end.isPending} testID="confirm-end-visit" />
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
