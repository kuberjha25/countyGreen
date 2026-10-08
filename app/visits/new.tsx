import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { get, post } from "@/src/api";
import { useCan } from "@/src/auth";
import { PARTNER_TYPES, STATES } from "@/src/brand";
import { PartnerChooser } from "@/src/components/partners";
import { ChoiceChips, Field, OptionTile, Select, useScreenStyles } from "@/src/components/ui";
import { FormWizard } from "@/src/components/wizard";
import { digits, fmtDay, isLast4, maskedAadhaar, maskedMobile } from "@/src/format";
import { useLookups, useStaff } from "@/src/lookups";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

const DIRECT = "Direct";
const AUTO = "Auto-assign";

function nextDays(n: number) {
  return Array.from({ length: n }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return { label: fmtDay(d), wd: d.toLocaleDateString("en-IN", { weekday: "short" }), day: d.getDate() };
  });
}

// Screen 18 · Schedule Project Visit (staff, on behalf of CP / Broker / Influencer / Freelancer)
// Visit for · Visitor · Address & Project · Date & Time · Notes · Review · Success
export default function ScheduleVisit() {
  const params = useLocalSearchParams<{ lead_id?: string; demo?: string }>();
  const styles = useStyles();
  const s = useScreenStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const lookups = useLookups();
  const can = useCan();
  const staff = useStaff(can("visits", "assign"));
  const lead = useQuery({ queryKey: ["lead", params.lead_id], queryFn: () => get(`/leads/${params.lead_id}`), enabled: !!params.lead_id });
  const days = nextDays(14);
  const [f, setF] = useState(
    params.demo === "1"
      ? { visit_for: "Influencer", partner_id: "partner-ayesha", partner_name: "Ayesha Khan", assigned_to_id: "", visitor_type: "Client", full_name: "Priya Nair", mobile: "", mobile_last4: "2109", aadhaar_last4: "8834", email: "", address: "45, Sector 9", city: "Panchkula", state: "Haryana", project: "County Green", visit_date: days[2].label, visit_time: "11:00 AM", notes: "Client wants to see the club house and the plot layout." }
      : { visit_for: DIRECT, partner_id: "", partner_name: "", assigned_to_id: "", visitor_type: "Client", full_name: "", mobile: "", mobile_last4: "", aadhaar_last4: "", email: "", address: "", city: "", state: "", project: "County Green", visit_date: "", visit_time: "", notes: "" },
  );
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const [created, setCreated] = useState<any>(null);
  const prefilled = useRef(false);
  const viaPartner = f.visit_for !== DIRECT;

  // Opened from a lead: carry over the customer, partner and identification.
  useEffect(() => {
    const l = lead.data;
    if (!l || prefilled.current) return;
    prefilled.current = true;
    setF((x) => ({ ...x, visit_for: l.partner_type || DIRECT, partner_id: l.partner_id ?? "", partner_name: l.partner_name ?? "", full_name: l.full_name, mobile: l.mobile ?? "", mobile_last4: l.mobile_last4 ?? "", aadhaar_last4: l.aadhaar_last4 ?? "", email: l.email ?? "", city: l.city ?? "", state: l.state ?? "", address: l.address ?? "" }));
  }, [lead.data]);

  const create = useMutation({
    mutationFn: () => {
      const { visit_for, partner_name, assigned_to_id, ...rest } = f;
      const identity = viaPartner ? { partner_id: f.partner_id, mobile: "" } : { partner_id: null, mobile_last4: "", aadhaar_last4: "" };
      return post("/visits", { ...rest, ...identity, assigned_to_id: assigned_to_id || undefined, lead_id: params.lead_id });
    },
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ["visits"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["mis"] });
      if (params.lead_id) qc.invalidateQueries({ queryKey: ["lead", params.lead_id] });
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
        body: viaPartner ? `The visit is booked for ${f.partner_name}'s customer. The partner can track its status in their app.` : "The County Green site team has been notified.",
        meta: created ? [{ label: "Visitor", value: created.full_name }, { label: "Date", value: created.visit_date }, { label: "Time", value: created.visit_time }, { label: "Assigned staff", value: created.assigned_to }] : [],
        primary: { label: "View visit", onPress: () => router.replace(`/visits/${created?.id}`), testID: "visit-success-view" },
        secondary: { label: "Back to visits", onPress: () => router.dismissTo("/(tabs)/visits"), testID: "visit-success-back" },
      }}
      steps={[
        {
          key: "for", title: "Visit For", subtitle: params.lead_id && lead.data ? `From lead: ${lead.data.full_name}` : "Was this customer brought in by a CP, broker, influencer or freelancer?",
          validate: () => (viaPartner && !f.partner_id ? `Select the ${f.visit_for.toLowerCase()}` : undefined),
          summary: () => [{ label: "Visit for", value: viaPartner ? `${f.visit_for} · ${f.partner_name}` : "Direct (no partner)" }, ...(can("visits", "assign") ? [{ label: "Assigned staff", value: staff.data?.find((x) => x.id === f.assigned_to_id)?.name ?? AUTO }] : [])],
          render: () => (
            <View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: spacing.lg }}>
                {[{ key: DIRECT, icon: "storefront-outline" }, ...PARTNER_TYPES].map((p) => (
                  <OptionTile key={p.key} label={p.key === DIRECT ? "Direct (no partner)" : p.key} icon={p.icon as any} selected={f.visit_for === p.key} onPress={() => setF((x) => ({ ...x, visit_for: p.key, partner_id: x.visit_for === p.key ? x.partner_id : "", partner_name: x.visit_for === p.key ? x.partner_name : "" }))} testID={`visit-for-${p.key.toLowerCase().replace(/\s+/g, "-")}`} style={{ width: "47%", flexGrow: 1 }} />
                ))}
              </View>
              {viaPartner ? <PartnerChooser key={f.visit_for} value={f.partner_id || null} type={f.visit_for} label={`Select ${f.visit_for}`} onChange={(p) => setF((x) => ({ ...x, partner_id: p?.id ?? "", partner_name: p?.name ?? "" }))} testID="visit-partner" /> : null}
              {can("visits", "assign") ? (
                <ChoiceChips label="Assign to staff" value={staff.data?.find((x) => x.id === f.assigned_to_id)?.name ?? AUTO} options={[AUTO, ...(staff.data ?? []).map((x) => x.name)]} onChange={(n) => set("assigned_to_id")((staff.data ?? []).find((x) => x.name === n)?.id ?? "")} testID="visit-assign" />
              ) : null}
            </View>
          ),
        },
        {
          key: "visitor", title: "Visitor", subtitle: viaPartner ? "Identify the customer with the last 4 digits only." : "Who is visiting the project?",
          validate: () =>
            !f.full_name.trim() ? "Complete name is required"
              : viaPartner ? (!isLast4(f.mobile_last4) ? "Enter the last 4 digits of the mobile number" : !isLast4(f.aadhaar_last4) ? "Enter the last 4 digits of the Aadhaar number" : undefined)
              : digits(f.mobile).length < 10 ? "Enter a valid mobile number" : undefined,
          summary: () => [{ label: "Visitor type", value: f.visitor_type }, { label: "Name", value: f.full_name }, ...(viaPartner ? [{ label: "Mobile", value: maskedMobile(f.mobile_last4) }, { label: "Aadhaar", value: maskedAadhaar(f.aadhaar_last4) }] : [{ label: "Mobile", value: f.mobile }]), { label: "Email", value: f.email }],
          render: () => (
            <View>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: spacing.lg }}>
                {[{ k: "Client", i: "person-outline" }, { k: "Broker", i: "briefcase-outline" }].map((t) => <OptionTile key={t.k} label={t.k} icon={t.i as any} selected={f.visitor_type === t.k} onPress={() => set("visitor_type")(t.k)} testID={`visitor-type-${t.k.toLowerCase()}`} style={{ flex: 1 }} />)}
              </View>
              <Field label="Complete name" placeholder="Enter complete name" value={f.full_name} onChangeText={set("full_name")} icon="person-outline" testID="visit-name-input" />
              {viaPartner ? (
                <>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Field label="Mobile – last 4 digits" placeholder="e.g. 3210" value={f.mobile_last4} onChangeText={(v) => set("mobile_last4")(digits(v).slice(0, 4))} keyboardType="number-pad" maxLength={4} icon="call-outline" containerStyle={{ flex: 1 }} testID="visit-mobile-last4-input" />
                    <Field label="Aadhaar – last 4 digits" placeholder="e.g. 4821" value={f.aadhaar_last4} onChangeText={(v) => set("aadhaar_last4")(digits(v).slice(0, 4))} keyboardType="number-pad" maxLength={4} icon="card-outline" containerStyle={{ flex: 1 }} testID="visit-aadhaar-last4-input" />
                  </View>
                  <Text style={[s.caption, { marginTop: -8 }]}>The full mobile number is not captured for partner customers.</Text>
                </>
              ) : (
                <>
                  <Field label="Mobile number" placeholder="Enter mobile number" value={f.mobile} onChangeText={set("mobile")} keyboardType="phone-pad" icon="call-outline" testID="visit-mobile-input" />
                </>
              )}
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
              <Select label="Project" value={f.project} options={["County Green"]} onChange={set("project")} icon="home-outline" testID="visit-project-select" />
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
                {lookups.time_slots.map((t) => {
                  const sel = f.visit_time === t;
                  return (
                    <Pressable key={t} onPress={() => set("visit_time")(t)} style={[styles.slot, sel && styles.slotSel]} testID={`slot-${t.replace(/[^0-9a-z]/gi, "").toLowerCase()}`}>
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
          render: () => <Field label="Visit notes" placeholder="e.g. Client wants to see the club house and plot layout" value={f.notes} onChangeText={set("notes")} multiline testID="visit-notes-input" />,
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
