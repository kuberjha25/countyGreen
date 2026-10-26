import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { errorMessage } from "@/src/api";
import { STATES } from "@/src/brand";
import { ErrorState, Field, Loading, OptionTile, Select } from "@/src/components/ui";
import { FormWizard } from "@/src/components/wizard";
import { digits, fmtDay, isoDay } from "@/src/format";
import { useProjects, useTimeSlots } from "@/src/lookups";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchLead } from "@/src/store/leadsSlice";
import { fetchTimeSlots } from "@/src/store/lookupsSlice";
import { useRun } from "@/src/store/useRun";
import { createVisit } from "@/src/store/visitsSlice";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";
import { isMasked } from "@/src/types";

const TEMPS = [{ k: "hot", label: "Hot", i: "flame-outline" }, { k: "warm", label: "Warm", i: "sunny-outline" }, { k: "cold", label: "Cold", i: "snow-outline" }] as const;
const nextDays = (n: number) => Array.from({ length: n }, (_, i) => new Date(Date.now() + i * 86400000));

// Screen 18 · Schedule Project Visit (POST /api/visits — creates or reuses the lead by mobile).
// Visitor · Project & Address · Date & Time slot · Remarks · Review · Success
export default function ScheduleVisit() {
  const params = useLocalSearchParams<{ lead_id?: string }>();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const projects = useProjects();
  const slots = useTimeSlots();
  const lead = useAppSelector((st) => (params.lead_id ? st.leads.byId[Number(params.lead_id)]?.data : undefined));
  const [f, setF] = useState({ full_name: "", mobile: "", email: "", lead_type: "warm", project: "", address: "", city: "", state: "", visit_date: "", slot: 0, remarks: "" });
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const [created, setCreated] = useState<{ id: number } | null>(null);
  const [run, saving] = useRun();
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (params.lead_id && !lead) dispatch(fetchLead(Number(params.lead_id)));
  }, [dispatch, params.lead_id, lead]);
  // Opened from a lead: carry over the customer details.
  if (lead && !prefilled) {
    setPrefilled(true);
    setF((x) => ({ ...x, full_name: lead.full_name ?? "", mobile: isMasked(lead.mobile) ? "" : lead.mobile ?? "", email: isMasked(lead.email) ? "" : lead.email ?? "", lead_type: lead.lead_type ?? "warm", project: lead.project_name ?? "", address: lead.address ?? "", city: lead.city ?? "", state: lead.state ?? "" }));
  }

  const projectId = projects.data?.find((p) => p.name === f.project)?.id ?? (projects.data?.length === 1 ? projects.data[0].id : undefined);
  const slot = slots.data?.find((t) => t.id === f.slot);

  const submit = async () => {
    try {
      const v = await run<{ id: number }>(
        createVisit({ full_name: f.full_name.trim(), mobile: digits(f.mobile), email: f.email.trim() || undefined, lead_type: f.lead_type, project_id: projectId!, visit_date: f.visit_date, time_slot_id: f.slot, address: f.address.trim() || undefined, city: f.city.trim() || undefined, state: f.state || undefined, remarks: f.remarks.trim() || undefined }),
      );
      setCreated(v);
    } catch (e) {
      toast.show(errorMessage(e), "error");
    }
  };

  return (
    <FormWizard
      testID="schedule-visit-screen"
      title="Schedule Visit"
      done={!!created}
      onError={(m) => toast.show(m, "error")}
      onSubmit={submit}
      submitting={saving}
      submitLabel="Confirm visit"
      success={{
        title: "Visit Scheduled",
        body: "The County Green site team has been notified.",
        meta: [{ label: "Visitor", value: f.full_name }, { label: "Date", value: f.visit_date ? fmtDay(new Date(f.visit_date)) : "" }, { label: "Time", value: slot?.formatted_slot ?? "" }],
        primary: { label: "View visit", onPress: () => router.replace(`/visits/${created?.id}`), testID: "visit-success-view" },
        secondary: { label: "Back to visits", onPress: () => router.dismissTo("/(tabs)/visits"), testID: "visit-success-back" },
      }}
      steps={[
        {
          key: "visitor", title: "Visitor", subtitle: params.lead_id && lead ? `From lead: ${lead.full_name}` : "Who is visiting the project?",
          validate: () => (!f.full_name.trim() ? "Complete name is required" : digits(f.mobile).length !== 10 ? "Enter a valid 10-digit mobile number" : f.email && !/^\S+@\S+\.\S+$/.test(f.email) ? "Enter a valid email address" : undefined),
          summary: () => [{ label: "Name", value: f.full_name }, { label: "Mobile", value: f.mobile }, { label: "Email", value: f.email }, { label: "Lead type", value: TEMPS.find((t) => t.k === f.lead_type)?.label }],
          render: () => (
            <View>
              <Field label="Complete name" placeholder="Enter complete name" value={f.full_name} onChangeText={set("full_name")} icon="person-outline" testID="visit-name-input" />
              <Field label="Mobile number" placeholder="10-digit mobile number" value={f.mobile} onChangeText={(v) => set("mobile")(digits(v).slice(0, 10))} keyboardType="number-pad" maxLength={10} icon="call-outline" testID="visit-mobile-input" />
              <Field label="Email address" placeholder="Enter email address" value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" testID="visit-email-input" />
              <View style={{ flexDirection: "row", gap: 10 }}>
                {TEMPS.map((t) => <OptionTile key={t.k} label={t.label} icon={t.i} selected={f.lead_type === t.k} onPress={() => set("lead_type")(t.k)} testID={`visit-temp-${t.k}`} style={{ flex: 1 }} />)}
              </View>
            </View>
          ),
        },
        {
          key: "address", title: "Project & Address", subtitle: "Which project, and where is the visitor coming from?",
          validate: () => (!projectId ? "Select the project" : undefined),
          summary: () => [{ label: "Project", value: f.project || projects.data?.[0]?.name }, { label: "Address", value: [f.address, f.city, f.state].filter(Boolean).join(", ") }],
          render: () => (
            <View>
              <Select label="Project" value={f.project || (projects.data?.length === 1 ? projects.data[0].name : "")} options={(projects.data ?? []).map((p) => p.name)} onChange={set("project")} placeholder={projects.status === "loading" ? "Loading…" : "Select project"} icon="home-outline" testID="visit-project-select" />
              <Field label="Address" placeholder="Enter complete address" value={f.address} onChangeText={set("address")} icon="location-outline" testID="visit-address-input" />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Field label="City" placeholder="Enter city" value={f.city} onChangeText={set("city")} containerStyle={{ flex: 1 }} testID="visit-city-input" />
                <View style={{ flex: 1 }}><Select label="State" value={f.state} options={STATES.includes(f.state) || !f.state ? STATES : [f.state, ...STATES]} onChange={set("state")} placeholder="Select state" testID="visit-state-select" /></View>
              </View>
            </View>
          ),
        },
        {
          key: "datetime", title: "Date & Time", subtitle: "Pick a convenient slot for the site visit.",
          validate: () => (!f.visit_date ? "Select a visit date" : !f.slot ? "Select a time slot" : undefined),
          summary: () => [{ label: "Visit date", value: f.visit_date ? fmtDay(new Date(f.visit_date)) : "" }, { label: "Time slot", value: slot?.formatted_slot }],
          render: () => (
            <View>
              <Text style={styles.label}>VISIT DATE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }} testID="date-picker-row">
                {nextDays(14).map((d) => {
                  const v = isoDay(d);
                  const sel = f.visit_date === v;
                  return (
                    <Pressable key={v} onPress={() => set("visit_date")(v)} style={[styles.day, sel && styles.daySel]} testID={`date-${v}`}>
                      <Text style={[styles.dayWd, sel && { color: colors.onBrandPrimary }]}>{d.toLocaleDateString("en-IN", { weekday: "short" }).toUpperCase()}</Text>
                      <Text style={[styles.dayNum, sel && { color: colors.onBrandPrimary }]}>{d.getDate()}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={[styles.label, { marginTop: spacing.xl }]}>TIME SLOT</Text>
              {slots.status === "loading" ? <Loading /> : slots.status === "failed" ? <ErrorState message={slots.error ?? "Could not load time slots"} onRetry={() => dispatch(fetchTimeSlots())} /> : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(slots.data ?? []).map((t) => {
                  const sel = f.slot === t.id;
                  return (
                    <Pressable key={t.id} onPress={() => setF((x) => ({ ...x, slot: t.id }))} style={[styles.slot, sel && styles.slotSel]} testID={`slot-${t.id}`}>
                      <Text style={[styles.slotText, sel && { color: colors.onBrandPrimary }]}>{t.formatted_slot}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ),
        },
        {
          key: "notes", title: "Remarks", subtitle: "Anything the site team should prepare for?",
          summary: () => [{ label: "Remarks", value: f.remarks }],
          render: () => <Field label="Remarks" placeholder="e.g. Client wants to see the club house and plot layout" value={f.remarks} onChangeText={set("remarks")} multiline testID="visit-notes-input" />,
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
  slot: { minHeight: 40, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, justifyContent: "center" },
  slotSel: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  slotText: { fontFamily: fonts.medium, fontSize: 13, color: colors.onSurface },
}));
