import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get, patch } from "@/src/api";
import { TIME_SLOTS } from "@/src/brand";
import { Button, ChoiceChips, Field, Header, Loading, OptionTile, ScreenTitle, SectionLabel, Select, useScreenStyles } from "@/src/components/ui";
import { useLookups } from "@/src/lookups";
import { spacing } from "@/src/theme";
import { useToast } from "@/src/toast";

const TEMPS = [{ k: "Hot", i: "flame-outline" }, { k: "Warm", i: "sunny-outline" }, { k: "Cold", i: "snow-outline" }] as const;

// Screen 14 · Update Lead
export default function UpdateLead() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useScreenStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const lookups = useLookups();
  const lead = useQuery({ queryKey: ["lead", id], queryFn: () => get(`/leads/${id}`) });
  const [form, setForm] = useState({ status: "", temperature: "", follow_up_date: "", follow_up_time: "", next_action: "", notes: "", full_name: "", mobile: "", email: "" });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const [dateErr, setDateErr] = useState<string | undefined>();

  useEffect(() => {
    if (lead.data) setForm({ status: lead.data.status, temperature: lead.data.temperature, follow_up_date: lead.data.follow_up_date ?? "", follow_up_time: lead.data.follow_up_time ?? "", next_action: lead.data.next_action ?? "", notes: lead.data.notes ?? "", full_name: lead.data.full_name, mobile: lead.data.mobile, email: lead.data.email ?? "" });
  }, [lead.data]);

  const save = useMutation({
    mutationFn: () => patch(`/leads/${id}`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lead", id] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["mis"] });
      toast.show("Lead updated successfully", "success");
      router.back();
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const submit = () => {
    if (form.follow_up_date && !/^\d{2}[ /-]\w{2,3}[ /-]\d{4}$/.test(form.follow_up_date)) return setDateErr("Use format DD MMM YYYY, e.g. 12 Sep 2026");
    setDateErr(undefined);
    save.mutate();
  };

  return (
    <View style={s.screen} testID="update-lead-screen">
      <Header title="Update Lead" showBell={false} />
      {lead.isLoading ? (
        <Loading />
      ) : (
        <>
          <KeyboardAwareScrollView bottomOffset={110} contentContainerStyle={[s.content, { paddingBottom: 120, paddingTop: 8 }]} keyboardShouldPersistTaps="handled">
            <ScreenTitle title={lead.data?.full_name ?? "Lead"} subtitle="Update status, follow-up and notes for this lead." />
            <SectionLabel>Lead Temperature</SectionLabel>
            <View style={{ flexDirection: "row", gap: 10, marginBottom: spacing.xl }}>
              {TEMPS.map((t) => <OptionTile key={t.k} label={t.k} icon={t.i} selected={form.temperature === t.k} onPress={() => set("temperature")(t.k)} testID={`temp-${t.k.toLowerCase()}`} style={{ flex: 1 }} />)}
            </View>
            <ChoiceChips label="Lead status" value={form.status} options={lookups.lead_statuses} onChange={set("status")} testID="status" />
            <SectionLabel>Follow-up</SectionLabel>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Field label="Follow-up date" placeholder="DD MMM YYYY" value={form.follow_up_date} onChangeText={set("follow_up_date")} rightIcon="calendar-outline" error={dateErr} containerStyle={{ flex: 1.2 }} testID="followup-date-input" />
              <View style={{ flex: 1 }}><Select label="Time" value={form.follow_up_time} options={TIME_SLOTS} onChange={set("follow_up_time")} placeholder="Time" testID="followup-time-select" /></View>
            </View>
            <ChoiceChips label="Next action" value={form.next_action} options={lookups.next_actions} onChange={set("next_action")} testID="next-action" />
            <Field label="Notes" placeholder="Add notes about this lead…" value={form.notes} onChangeText={set("notes")} multiline testID="notes-input" />
            <SectionLabel>Customer Information</SectionLabel>
            <Field label="Full name" value={form.full_name} onChangeText={set("full_name")} icon="person-outline" testID="update-name-input" />
            <Field label="Mobile number" value={form.mobile} onChangeText={set("mobile")} keyboardType="phone-pad" icon="call-outline" testID="update-mobile-input" />
            <Field label="Email address" value={form.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" testID="update-email-input" />
            <Text style={s.caption}>Every update is recorded in the lead{"'"}s activity history.</Text>
          </KeyboardAwareScrollView>
          <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
            <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + 16, gap: 8 }}>
              <Button label="Save update" icon="checkmark" variant="gold" onPress={submit} loading={save.isPending} testID="save-update-button" />
              <Button label="Cancel" variant="ghost" small onPress={() => router.back()} testID="cancel-update-button" />
            </View>
          </KeyboardStickyView>
        </>
      )}
    </View>
  );
}
