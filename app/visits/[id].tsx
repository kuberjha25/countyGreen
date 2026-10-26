import Ionicons from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";

import { errorMessage } from "@/src/api";
import { useCan } from "@/src/auth";
import { Avatar, Badge, BottomNav, BottomSheet, Button, Card, ErrorState, Field, Header, InfoRow, Loading, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { fmtDate } from "@/src/format";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { useRun } from "@/src/store/useRun";
import { attendVisit, fetchVisit } from "@/src/store/visitsSlice";
import { fonts, makeStyles, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";
import { isMasked, label, VISIT_STATUS_LABEL } from "@/src/types";

// Screen 17 · Project Visit Details (GET /api/visits/{id}) + "Mark attended" (POST /api/visits/{id}/attend).
// Partners see it view-only.
export default function VisitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const can = useCan();
  const entry = useAppSelector((st) => st.visits.byId[Number(id)]);
  const v = entry?.data;
  const [confirm, setConfirm] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const [run, saving] = useRun();

  useEffect(() => {
    if (!entry || entry.status === "idle") dispatch(fetchVisit(Number(id)));
  }, [dispatch, id, entry]);

  const attend = async () => {
    if (!remarks.trim()) return setErr("Add a short note about the visit");
    setErr(undefined);
    try {
      await run(attendVisit({ id: Number(id), remarks: remarks.trim() }));
      setConfirm(false);
      setRemarks("");
      toast.show("Visit marked as attended", "success");
    } catch (e) {
      toast.show(errorMessage(e), "error");
    }
  };

  const open = v && (v.status === "scheduled" || v.status === "in_progress");

  return (
    <View style={s.screen} testID="visit-detail-screen">
      <Header title="Project Visit Details" />
      {!v ? (
        entry?.status === "failed" ? <ErrorState message={entry.error ?? "Visit not found"} onRetry={() => dispatch(fetchVisit(Number(id)))} /> : <Loading />
      ) : (
        <>
          <ScrollView contentContainerStyle={[s.content, { paddingBottom: spacing.lg }]} showsVerticalScrollIndicator={false}>
            <View style={[s.row, { gap: 14, marginBottom: spacing.md }]}>
              <Avatar name={v.visitor_name} size={56} />
              <View style={{ flex: 1 }}>
                <Text style={[s.h2, { fontSize: 26 }]} testID="visit-name">{v.visitor_name}</Text>
                <View style={[s.row, { gap: 6, marginTop: 6, flexWrap: "wrap" }]}>
                  <Badge label={label(VISIT_STATUS_LABEL, v.status)} small />
                  {v.lead_type ? <Badge label={label({}, v.lead_type)} small /> : null}
                </View>
              </View>
              {v.mobile && !isMasked(v.mobile) ? <Pressable onPress={() => Linking.openURL(`tel:${v.mobile}`)} style={styles.call} testID="visit-call-button"><Ionicons name="call" size={18} color={colors.onBrandPrimary} /></Pressable> : null}
            </View>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: spacing.sm }}>
              <Card style={{ flex: 1 }}><Text style={s.caption}>VISIT DATE</Text><Text style={styles.big}>{fmtDate(v.visit_date)}</Text></Card>
              <Card style={{ flex: 1 }}><Text style={s.caption}>VISIT TIME</Text><Text style={styles.big}>{v.visit_time ?? "—"}</Text></Card>
            </View>

            <SectionLabel style={{ marginTop: spacing.lg }}>Visit Information</SectionLabel>
            <Card>
              <InfoRow icon="home-outline" label="Project" value={v.project_name ?? undefined} />
              <InfoRow icon="person-outline" label="Booked by" value={v.booked_by ?? undefined} />
              <InfoRow icon="person-circle-outline" label="Assigned County Green staff" value={v.assigned_to ?? undefined} testID="visit-assigned-staff" />
              {v.visit_type && v.visit_type !== "-" ? <InfoRow icon="pricetag-outline" label="Visitor type" value={label({}, v.visit_type)} /> : null}
            </Card>

            <SectionLabel style={{ marginTop: spacing.lg }}>Customer Information</SectionLabel>
            <Card>
              <InfoRow icon="call-outline" label="Mobile" value={v.mobile ?? undefined} />
              <InfoRow icon="mail-outline" label="Email" value={v.email ?? undefined} />
            </Card>

            <SectionLabel style={{ marginTop: spacing.lg }}>Remarks</SectionLabel>
            <Card><Text style={s.body}>{v.remarks || "No remarks added."}</Text></Card>
          </ScrollView>
          {can("visits", "modify") && open ? (
            <View style={styles.footer}>
              <Button label="Mark attended" icon="checkmark-done-outline" variant="gold" onPress={() => setConfirm(true)} testID="end-visit-button" />
            </View>
          ) : null}
          <BottomSheet visible={confirm} onClose={() => setConfirm(false)} title="Mark visit attended" subtitle="The visit is marked completed and recorded against the lead." testID="end-visit-sheet">
            <Field label="Visit remarks" placeholder="What was discussed? Next steps…" value={remarks} onChangeText={setRemarks} multiline error={err} testID="end-visit-notes" />
            <Button label="Confirm" variant="gold" onPress={attend} loading={saving} testID="confirm-end-visit" />
            <Button label="Cancel" variant="ghost" small onPress={() => setConfirm(false)} style={{ marginTop: 8 }} testID="cancel-end-visit" />
          </BottomSheet>
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
}));
