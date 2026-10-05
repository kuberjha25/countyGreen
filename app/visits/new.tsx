import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { post } from "@/src/api";
import { STATES, TIME_SLOTS } from "@/src/brand";
import { Field, OptionTile, Select } from "@/src/components/ui";
import { FormWizard } from "@/src/components/wizard";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

function nextDays(n: number) {
  return Array.from({ length: n }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }), wd: d.toLocaleDateString("en-IN", { weekday: "short" }), day: d.getDate() };
  });
}

// Screen 18 · Schedule Project Visit — Visitor · Contact · Date & Time · Notes · Review · Success
export default function ScheduleVisit() {
  const params = useLocalSearchParams<{ name?: string; mobile?: string; lead_id?: string; demo?: string }>();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const [f, setF] = useState(
    params.demo === "1"
      ? { visitor_type: "Client", full_name: "Priya Nair", mobile: "87654 32109", email: "priya.nair@example.com", address: "45, Sector 9", city: "Panchkula", state: "Haryana", project: "County Greens", visit_date: nextDays(3)[2].label, visit_time: "11:00 AM", notes: "Client wants to see the club house and sample layout." }
      : { visitor_type: "Client", full_name: params.name ?? "", mobile: params.mobile ?? "", email: "", address: "", city: "", state: "", project: "County Greens", visit_date: "", visit_time: "", notes: "" },
  );
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const [created, setCreated] = useState<any>(null);
  const days = nextDays(14);

  const create = useMutation({
    mutationFn: () => post("/visits", { ...f, lead_id: params.lead_id }),
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["visits"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      setCreated(v);
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  return (
    <FormWizard
      testID="schedule-visit-screen"
      title="Schedule Visit"
      done={!!created}
      onError={(m) => toast.show(m, "error")}
      onSubmit={() => create.mutate()}
      submitting={create.isPending}
      submitLabel="Confirm visit"
      success={{
        title: "Visit Scheduled",
        body: "The County Greens site team has been notified. You'll receive a reminder before the visit.",
        meta: created ? [{ label: "Visitor", value: created.full_name }, { label: "Date", value: created.visit_date }, { label: "Time", value: created.visit_time }] : [],
        primary: { label: "View visit", onPress: () => router.replace(`/visits/${created?.id}`), testID: "visit-success-view" },
        secondary: { label: "Back to visits", onPress: () => router.replace("/(tabs)/visits"), testID: "visit-success-back" },
      }}
      steps={[
        {
          key: "visitor", title: "Visitor", subtitle: "Who is visiting the project?",
          validate: () => (!f.full_name.trim() ? "Complete name is required" : f.mobile.replace(/\D/g, "").length < 10 ? "Enter a valid mobile number" : undefined),
          summary: () => [{ label: "Visitor type", value: f.visitor_type }, { label: "Name", value: f.full_name }, { label: "Mobile", value: f.mobile }, { label: "Email", value: f.email }],
          render: () => (
            <View>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: spacing.lg }}>
                {[{ k: "Client", i: "person-outline" }, { k: "Broker", i: "briefcase-outline" }].map((t) => <OptionTile key={t.k} label={t.k} icon={t.i as any} selected={f.visitor_type === t.k} onPress={() => set("visitor_type")(t.k)} testID={`visitor-type-${t.k.toLowerCase()}`} style={{ flex: 1 }} />)}
              </View>
              <Field label="Complete name" placeholder="Enter complete name" value={f.full_name} onChangeText={set("full_name")} icon="person-outline" testID="visit-name-input" />
              <Field label="Mobile number" placeholder="Enter mobile number" value={f.mobile} onChangeText={set("mobile")} keyboardType="phone-pad" icon="call-outline" testID="visit-mobile-input" />
              <Field label="Email address" placeholder="Enter email address" value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" testID="visit-email-input" />
            </View>
          ),
        },
        {
          key: "address", title: "Address & Project", subtitle: "Where is the visitor coming from?",
          summary: () => [{ label: "Address", value: f.address }, { label: "City", value: f.city }, { label: "State", value: f.state }, { label: "Project", value: f.project }],
          render: () => (
            <View>
              <Field label="Address" placeholder="Enter complete address" value={f.address} onChangeText={set("address")} icon="location-outline" testID="visit-address-input" />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Field label="City" placeholder="Enter city" value={f.city} onChangeText={set("city")} containerStyle={{ flex: 1 }} testID="visit-city-input" />
                <View style={{ flex: 1 }}><Select label="State" value={f.state} options={STATES} onChange={set("state")} placeholder="Select state" testID="visit-state-select" /></View>
              </View>
              <Select label="Project" value={f.project} options={["County Greens"]} onChange={set("project")} icon="home-outline" testID="visit-project-select" />
            </View>
          ),
        },
        {
          key: "datetime", title: "Date & Time", subtitle: "Pick a convenient slot for the site visit.",
          validate: () => (!f.visit_date ? "Select a visit date" : !f.visit_time ? "Select a time slot" : undefined),
          summary: () => [{ label: "Visit date", value: f.visit_date }, { label: "Time slot", value: f.visit_time }],
          render: () => (
            <View>
              <Text style={styles.label}>VISIT DATE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }} testID="date-picker-row">
                {days.map((d) => {
                  const sel = f.visit_date === d.label;
                  return (
                    <Pressable key={d.label} onPress={() => set("visit_date")(d.label)} style={[styles.day, sel && styles.daySel]} testID={`date-${d.day}`}>
                      <Text style={[styles.dayWd, sel && { color: colors.onBrandPrimary }]}>{d.wd.toUpperCase()}</Text>
                      <Text style={[styles.dayNum, sel && { color: colors.onBrandPrimary }]}>{d.day}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={[styles.label, { marginTop: spacing.xl }]}>TIME SLOT</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {TIME_SLOTS.map((t) => {
                  const sel = f.visit_time === t;
                  return (
                    <Pressable key={t} onPress={() => set("visit_time")(t)} style={[styles.slot, sel && styles.slotSel]} testID={`slot-${t.replace(/[^0-9]/g, "")}`}>
                      <Text style={[styles.slotText, sel && { color: colors.onBrandPrimary }]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ),
        },
        {
          key: "notes", title: "Notes", subtitle: "Anything the site team should prepare for?",
          summary: () => [{ label: "Notes", value: f.notes }],
          render: () => <Field label="Visit notes" placeholder="e.g. Client wants to see the club house and sample layout" value={f.notes} onChangeText={set("notes")} multiline testID="visit-notes-input" />,
        },
      ]}
    />
  );
}

const useStyles = makeStyles((colors) => ({
  label: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.4, color: colors.onSurfaceTertiary, marginBottom: 10 },
  day: { width: 60, height: 70, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", gap: 4 },
  daySel: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  dayWd: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1, color: colors.muted },
  dayNum: { fontFamily: fonts.display, fontSize: 24, color: colors.onSurface },
  slot: { height: 40, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
  slotSel: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  slotText: { fontFamily: fonts.medium, fontSize: 13, color: colors.onSurface },
}));
