import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get, post } from "@/src/api";
import { partnerShort } from "@/src/brand";
import { Timeline } from "@/src/components/sections";
import { Avatar, Badge, BottomNav, Button, Card, ErrorState, Field, Header, InfoRow, Loading, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { fmtDate, fmtDateTime } from "@/src/format";
import { useLookups } from "@/src/lookups";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

// Screen · Lead Detail (single consolidated screen) + "Request documents from CRM" sheet for converted leads
export default function LeadDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const lookups = useLookups();
  const lead = useQuery({ queryKey: ["lead", id], queryFn: () => get(`/leads/${id}`) });
  const l = lead.data;
  const converted = l?.status === "Converted";
  const [requesting, setRequesting] = useState(false);
  const [docs, setDocs] = useState<string[]>([]);
  const [remarks, setRemarks] = useState("");

  const request = useMutation({
    mutationFn: () => post(`/leads/${id}/document-requests`, { documents: docs, remarks: remarks.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      setRequesting(false);
      setDocs([]);
      setRemarks("");
      toast.show("Request raised to the CRM team", "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const toggleDoc = (d: string) => setDocs((x) => (x.includes(d) ? x.filter((y) => y !== d) : [...x, d]));

  return (
    <View style={s.screen} testID="lead-detail-screen">
      <Header title="Lead Detail" />
      {lead.isLoading ? <Loading /> : lead.isError || !l ? <ErrorState message={(lead.error as Error)?.message ?? "Lead not found"} onRetry={lead.refetch} /> : (
        <>
          <ScrollView contentContainerStyle={[s.content, { paddingBottom: spacing.xl }]} showsVerticalScrollIndicator={false}>
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
                {l.mobile ? (
                  <Pressable onPress={() => Linking.openURL(`tel:${l.mobile.replace(/\s/g, "")}`)} style={styles.call} testID="lead-call-button">
                    <Ionicons name="call" size={18} color={colors.forestDeep} />
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.headerMeta}>
                <View><Text style={styles.metaLabel}>NEXT FOLLOW-UP</Text><Text style={styles.metaValue}>{l.follow_up_date || "—"}{l.follow_up_time ? ` · ${l.follow_up_time}` : ""}</Text></View>
                <View style={{ alignItems: "flex-end" }}><Text style={styles.metaLabel}>LAST UPDATED</Text><Text style={styles.metaValue}>{fmtDate(l.updated_at)}</Text></View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(60).duration(400)}>
              <SectionLabel style={{ marginTop: spacing.xl }}>Lead Ownership</SectionLabel>
              <Card>
                <View style={styles.ownerRow}>
                  <View style={styles.ownerIcon}><Ionicons name="person-outline" size={16} color={colors.brandPrimary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ownerLabel}>LEAD BY</Text>
                    <View style={[s.row, { gap: 6, marginTop: 2, flexWrap: "wrap" }]}>
                      {l.partner_type ? <Badge label={partnerShort(l.partner_type)} tone="gold" small /> : null}
                      <Text style={styles.ownerValue}>{l.partner_name || "—"}</Text>
                    </View>
                    {l.partner_type ? <Text style={s.caption}>{l.partner_type}</Text> : null}
                  </View>
                </View>
                <InfoRow icon="person-circle-outline" label="Assigned County Greens staff" value={l.assigned_to || "Not assigned yet"} testID="lead-assigned-staff" />
              </Card>
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

            {converted ? (
              <Animated.View entering={FadeInUp.delay(200).duration(400)}>
                <SectionLabel style={{ marginTop: spacing.xl }}>Document Requests (CRM)</SectionLabel>
                <Card>
                  {(l.document_requests ?? []).length ? (
                    (l.document_requests ?? []).map((r: any, i: number) => (
                      <View key={r.id ?? i} style={[styles.reqRow, i > 0 && styles.reqBorder]} testID={`doc-request-${i}`}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.name}>{(r.documents ?? []).join(", ")}</Text>
                          <Text style={s.meta}>Raised to {r.raised_to ?? "CRM Team"} · {fmtDateTime(r.raised_at)}</Text>
                          {r.remarks ? <Text style={[s.caption, { marginTop: 2 }]}>{r.remarks}</Text> : null}
                        </View>
                        <Badge label={r.status ?? "Pending"} small />
                      </View>
                    ))
                  ) : (
                    <Text style={s.bodyMuted}>Need the booking form, allotment letter or receipts for this customer? Raise a request to the CRM team.</Text>
                  )}
                  <Button label="Request documents" icon="document-attach-outline" variant="secondary" small onPress={() => setRequesting(true)} style={{ marginTop: spacing.md }} testID="request-documents-button" />
                </Card>
              </Animated.View>
            ) : null}

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
          <View style={styles.footer}>
            {converted ? (
              <Button label="Request docs" icon="document-attach-outline" variant="secondary" onPress={() => setRequesting(true)} style={{ flex: 1 }} testID="lead-request-docs-footer" />
            ) : (
              <Button label="Schedule visit" icon="calendar-outline" variant="secondary" onPress={() => router.push({ pathname: "/visits/new", params: { name: l.full_name, mobile: l.mobile, lead_id: l.id } })} style={{ flex: 1 }} testID="lead-schedule-visit-button" />
            )}
            <Button label="Update lead" icon="create-outline" onPress={() => router.push(`/leads/${id}/update`)} style={{ flex: 1 }} testID="lead-update-button" />
          </View>

          <Modal visible={requesting} transparent animationType="fade" onRequestClose={() => setRequesting(false)}>
            <Pressable style={styles.backdrop} onPress={() => setRequesting(false)}>
              <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}} testID="request-documents-sheet">
                <View style={styles.handle} />
                <Text style={styles.sheetTitle}>Request documents</Text>
                <Text style={[s.bodyMuted, { marginBottom: spacing.md }]}>Your request for {l.full_name} goes to the County Greens CRM team. You{"'"}ll be notified when the documents are shared.</Text>
                <ScrollView style={{ maxHeight: 280 }}>
                  {lookups.document_request_types.map((d) => {
                    const sel = docs.includes(d);
                    return (
                      <Pressable key={d} onPress={() => toggleDoc(d)} style={[styles.check, sel && styles.checkSel]} testID={`request-doc-${d.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                        <Ionicons name={sel ? "checkbox" : "square-outline"} size={20} color={sel ? colors.brandPrimary : colors.muted} />
                        <Text style={[s.body, { fontSize: 14, flex: 1 }]}>{d}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <Field label="Remarks (optional)" placeholder="e.g. Customer needs the allotment letter for a bank loan" value={remarks} onChangeText={setRemarks} multiline containerStyle={{ marginTop: spacing.md }} testID="request-remarks-input" />
                <Button label="Raise request to CRM" icon="send-outline" variant="gold" disabled={!docs.length} onPress={() => request.mutate()} loading={request.isPending} testID="confirm-request-documents" />
                <Button label="Cancel" variant="ghost" small onPress={() => setRequesting(false)} style={{ marginTop: 8 }} testID="cancel-request-documents" />
              </Pressable>
            </Pressable>
          </Modal>
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
  ownerRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 8 },
  ownerIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.forestSoft, alignItems: "center", justifyContent: "center", marginTop: 2 },
  ownerLabel: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.2, color: colors.muted },
  ownerValue: { fontFamily: fonts.body, fontSize: 15, color: colors.onSurface },
  reqRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10 },
  reqBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  footer: { flexDirection: "row", gap: 10, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  sheetTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.onSurface, marginBottom: 4 },
  check: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: radius.md },
  checkSel: { backgroundColor: colors.forestSoft },
}));
