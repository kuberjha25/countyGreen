import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { errorMessage } from "@/src/api";
import { Button, ChoiceChips, Field, Header, ScreenTitle, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { fmtDay, isoDay } from "@/src/format";
import { useTimeSlots } from "@/src/lookups";
import { useAppSelector } from "@/src/store";
import { addFollowup, FollowupInput } from "@/src/store/leadsSlice";
import { useRun } from "@/src/store/useRun";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";
import { label, LEAD_STATUS_LABEL, LEAD_TYPES, LEAD_UPDATE_STATUSES } from "@/src/types";

const KEEP = "No change";
const days = (n: number) => Array.from({ length: n }, (_, i) => new Date(Date.now() + i * 86400000));
const cap = (v: string) => v[0].toUpperCase() + v.slice(1);

// Screen 14 · Follow-up / Update Lead (POST /api/leads/{id}/followups) — the note is required;
// status and lead type are optional and update the lead too ("converted" is set by the server only).
export default function UpdateLead() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const lead = useAppSelector((st) => st.leads.byId[Number(id)]?.data);
  const slots = useTimeSlots();
  const [date, setDate] = useState(isoDay(new Date()));
  const [time, setTime] = useState("");
  const [activity, setActivity] = useState("Follow Up");
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState(KEEP);
  const [leadType, setLeadType] = useState(KEEP);
  const [err, setErr] = useState<string | undefined>();
  const [run, saving] = useRun();

  const submit = async () => {
    if (!remarks.trim()) return setErr("Add a note about this follow-up");
    setErr(undefined);
    const body: FollowupInput = { followup_date: date, remarks: remarks.trim(), activity: activity.trim() || undefined };
    if (time) body.followup_time = time;
    if (status !== KEEP) body.status = LEAD_UPDATE_STATUSES.find((st) => LEAD_STATUS_LABEL[st] === status);
    if (leadType !== KEEP) body.lead_type = leadType.toLowerCase();
    try {
      await run(addFollowup({ id: Number(id), body }));
      toast.show("Follow-up added", "success");
      router.back();
    } catch (e) {
      toast.show(errorMessage(e), "error");
    }
  };

  return (
    <View style={s.screen} testID="update-lead-screen">
      <Header title="Follow-up" showBell={false} />
      <KeyboardAwareScrollView bottomOffset={110} contentContainerStyle={[s.content, { paddingBottom: 120, paddingTop: 8 }]} keyboardShouldPersistTaps="handled">
        <ScreenTitle title={lead?.full_name ?? "Lead"} subtitle={lead ? `Currently ${label(LEAD_STATUS_LABEL, lead.status)}` : "Add a follow-up and update the lead."} />

        <SectionLabel>Follow-up date</SectionLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: spacing.lg }} testID="followup-date-row">
          {days(21).map((d) => {
            const v = isoDay(d);
            const sel = date === v;
            return (
              <Pressable key={v} onPress={() => setDate(v)} style={[styles.day, sel && styles.daySel]} testID={`followup-date-${v}`}>
                <Text style={[styles.dayWd, sel && { color: colors.onBrandPrimary }]}>{d.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase()}</Text>
                <Text style={[styles.dayNum, sel && { color: colors.onBrandPrimary }]}>{d.getDate()}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text style={[s.caption, { marginTop: -8, marginBottom: spacing.lg }]}>{fmtDay(new Date(date))}</Text>

        <ChoiceChips label="Time (optional)" value={slots.data?.find((t) => t.start_time.slice(0, 5) === time)?.formatted_slot} options={(slots.data ?? []).map((t) => t.formatted_slot)} onChange={(v) => setTime(slots.data?.find((t) => t.formatted_slot === v)?.start_time.slice(0, 5) ?? "")} testID="followup-time" />
        <Field label="Activity" placeholder="e.g. Follow Up Call" value={activity} onChangeText={setActivity} testID="followup-activity" />
        <Field label="Note" placeholder="What was discussed? Next steps…" value={remarks} onChangeText={setRemarks} multiline error={err} testID="notes-input" />

        <SectionLabel>Update lead (optional)</SectionLabel>
        <ChoiceChips label="Lead status" value={status} options={[KEEP, ...LEAD_UPDATE_STATUSES.map((st) => LEAD_STATUS_LABEL[st])]} onChange={setStatus} testID="status" />
        <ChoiceChips label="Lead type" value={leadType} options={[KEEP, ...LEAD_TYPES.map(cap)]} onChange={setLeadType} testID="lead-type" />
        <Text style={s.caption}>Every follow-up is recorded in the lead{"'"}s activity history.</Text>
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + 16, gap: 8 }}>
          <Button label="Save follow-up" icon="checkmark" variant="gold" onPress={submit} loading={saving} testID="save-update-button" />
          <Button label="Cancel" variant="ghost" small onPress={() => router.back()} testID="cancel-update-button" />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  day: { width: 56, height: 66, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", gap: 2 },
  daySel: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  dayWd: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1, color: colors.muted },
  dayNum: { fontFamily: fonts.display, fontSize: 22, color: colors.onSurface },
}));
