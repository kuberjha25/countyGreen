import { useLocalSearchParams } from "expo-router";
import { Linking, ScrollView, Text, View } from "react-native";
import { useEffect } from "react";

import { Timeline } from "@/src/components/sections";
import { Badge, BottomNav, Button, Card, ErrorState, Header, InfoRow, Loading, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { fmtUtc } from "@/src/format";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchRequest } from "@/src/store/requestsSlice";
import { fonts, spacing } from "@/src/theme";
import { label, REQUEST_PRIORITY_LABEL, REQUEST_STATUS_LABEL } from "@/src/types";

// Request detail (GET /api/partner-requests/{id}) — the partner's note first, then the team's replies.
export default function RequestDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useScreenStyles();
  const dispatch = useAppDispatch();
  const entry = useAppSelector((st) => st.requests.byId[Number(id)]);
  const r = entry?.data;

  useEffect(() => {
    dispatch(fetchRequest(Number(id)));
  }, [dispatch, id]);

  return (
    <View style={s.screen} testID="request-detail-screen">
      <Header title="Request" />
      {!r ? (
        entry?.status === "failed" ? <ErrorState message={entry.error ?? "Request not found"} onRetry={() => dispatch(fetchRequest(Number(id)))} /> : <Loading />
      ) : (
        <ScrollView contentContainerStyle={[s.content, { paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>
          <Text style={s.caption}>{r.reference_id}</Text>
          <Text style={{ fontFamily: fonts.display, fontSize: 28, marginTop: 4 }} testID="request-type">{r.type}</Text>
          <View style={[s.row, { gap: 6, marginTop: 8, flexWrap: "wrap" }]}>
            <Badge label={label(REQUEST_STATUS_LABEL, r.status)} small />
            <Badge label={`${label(REQUEST_PRIORITY_LABEL, r.priority)} priority`} tone="muted" small />
            {r.is_overdue ? <Badge label="Overdue" tone="error" small /> : null}
          </View>

          <SectionLabel style={{ marginTop: spacing.xl }}>Details</SectionLabel>
          <Card>
            <InfoRow icon="business-outline" label="Project" value={r.project_name ?? undefined} />
            <InfoRow icon="grid-outline" label="Unit" value={r.unit_number ?? undefined} />
            <InfoRow icon="person-circle-outline" label="Assigned to" value={r.assigned_to || "Not assigned yet"} />
            <InfoRow icon="time-outline" label="Due by" value={fmtUtc(r.tat_deadline) || undefined} />
          </Card>

          <SectionLabel style={{ marginTop: spacing.xl }}>Timeline</SectionLabel>
          <Card>
            <Timeline
              items={(r.history ?? []).map((h) => ({
                title: label(REQUEST_STATUS_LABEL, h.status),
                at: h.date ? `${h.date.replace(" ", "T")}Z` : undefined,
                detail: [h.remarks, h.user_name && `by ${h.user_name}`].filter(Boolean).join(" · ") || undefined,
                footer: h.attachment ? <Button label="View attachment" icon="attach-outline" variant="secondary" small onPress={() => Linking.openURL(h.attachment!)} style={{ marginTop: 8, alignSelf: "flex-start" }} testID={`request-attachment-${h.id}`} /> : undefined,
              }))}
            />
          </Card>
        </ScrollView>
      )}
      <BottomNav />
    </View>
  );
}
