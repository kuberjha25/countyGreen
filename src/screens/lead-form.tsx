import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { get, patch, post } from "@/src/api";
import { useCan } from "@/src/auth";
import { PARTNER_TYPES, STATES } from "@/src/brand";
import { PartnerChooser } from "@/src/components/partners";
import { ChoiceChips, ErrorState, Field, Header, Loading, OptionTile, Select, useScreenStyles } from "@/src/components/ui";
import { FormWizard, WizardStep } from "@/src/components/wizard";
import { digits, isLast4, maskedAadhaar, maskedMobile } from "@/src/format";
import { useLookups, useStaff } from "@/src/lookups";
import { spacing } from "@/src/theme";
import { useToast } from "@/src/toast";

const BUDGETS = ["Under ₹50 L", "₹50 L – ₹1 Cr", "₹1 Cr – ₹2 Cr", "₹2 Cr – ₹3 Cr", "Above ₹3 Cr", "To be discussed"];
const TEMPS = [{ k: "Hot", i: "flame-outline" }, { k: "Warm", i: "sunny-outline" }, { k: "Cold", i: "snow-outline" }] as const;
const DIRECT = "Direct";
const AUTO = "Auto-assign";

const EMPTY = { lead_by: DIRECT, partner_id: "", partner_name: "", assigned_to_id: "", full_name: "", mobile: "", mobile_last4: "", aadhaar_last4: "", email: "", category: "", address: "", city: "", state: "", project: "County Green", configuration: "", budget: "", source: "", temperature: "Warm", follow_up_date: "", follow_up_time: "", notes: "" };
const DEMO = { ...EMPTY, lead_by: "Channel Partner", partner_id: "partner-gill", partner_name: "Gurpreet Gill", full_name: "Rajesh Kumar", mobile_last4: "3210", aadhaar_last4: "4821", category: "Individual", address: "12, Sector 40", city: "Chandigarh", state: "Chandigarh", configuration: "Plot", budget: "₹1 Cr – ₹2 Cr", source: "Reference", temperature: "Hot", follow_up_date: "12 Oct 2026", follow_up_time: "11:00 AM", notes: "Brought to the office by the CP. Looking for a 500 sq. yards plot." };

// Screen 15 · New Lead / Edit Lead — staff add leads on behalf of CP / Broker / Influencer / Freelancer.
// Partner leads are identified by the last 4 digits of mobile + Aadhaar only (no full number, no masking code).
export default function LeadFormScreen() {
  const s = useScreenStyles();
  const { id, demo } = useLocalSearchParams<{ id?: string; demo?: string }>();
  const lead = useQuery({ queryKey: ["lead", id], queryFn: () => get(`/leads/${id}`), enabled: !!id });
  if (!id) return <LeadForm initial={demo === "1" ? DEMO : EMPTY} />;
  const l = lead.data;
  if (!l) {
    return (
      <View style={s.screen}>
        <Header title="Edit Lead" showBell={false} />
        {lead.isError ? <ErrorState message={(lead.error as Error).message} onRetry={lead.refetch} /> : <Loading />}
      </View>
    );
  }
  const initial = { ...EMPTY, ...Object.fromEntries(Object.entries(l).filter(([k, v]) => k in EMPTY && typeof v === "string")), lead_by: l.partner_type || DIRECT, partner_id: l.partner_id ?? "", partner_name: l.partner_name ?? "", mobile: l.mobile ?? "" };
  return <LeadForm id={id} initial={initial} />;
}

function LeadForm({ id, initial }: { id?: string; initial: typeof EMPTY }) {
  const s = useScreenStyles();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const lookups = useLookups();
  const can = useCan();
  const editing = !!id;
  const staff = useStaff(can("leads", "assign"));
  const [f, setF] = useState(initial);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const [done, setDone] = useState<any>(null);
  const viaPartner = f.lead_by !== DIRECT;

  const payload = () => {
    const identity = viaPartner ? { partner_id: f.partner_id, mobile_last4: f.mobile_last4, aadhaar_last4: f.aadhaar_last4, email: f.email } : { partner_id: null, mobile: f.mobile, email: f.email };
    const details = { full_name: f.full_name.trim(), category: f.category, configuration: f.configuration, budget: f.budget, source: f.source, address: f.address, city: f.city, state: f.state, project: f.project };
    if (editing) return { ...identity, ...details };
    return { ...identity, ...details, temperature: f.temperature, follow_up_date: f.follow_up_date || null, follow_up_time: f.follow_up_time, notes: f.notes, assigned_to_id: f.assigned_to_id || undefined };
  };

  const save = useMutation({
    mutationFn: () => (editing ? patch(`/leads/${id}`, payload()) : post("/leads", payload())),
    onSuccess: (l) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead", l.id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["mis"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      setDone(l);
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const steps: WizardStep[] = [
    {
      key: "source", title: "Lead By", subtitle: "Was this customer brought in by a CP, broker, influencer or freelancer?",
      validate: () => (viaPartner && !f.partner_id ? `Select the ${f.lead_by.toLowerCase()} who brought this customer` : undefined),
      summary: () => [{ label: "Lead by", value: viaPartner ? `${f.lead_by} · ${f.partner_name}` : "Direct (no partner)" }, ...(can("leads", "assign") && !editing ? [{ label: "Assigned staff", value: staff.data?.find((x) => x.id === f.assigned_to_id)?.name ?? AUTO }] : [])],
      render: () => (
        <View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: spacing.lg }}>
            {[{ key: DIRECT, icon: "storefront-outline" }, ...PARTNER_TYPES].map((p) => (
              <OptionTile key={p.key} label={p.key === DIRECT ? "Direct (no partner)" : p.key} icon={p.icon as any} selected={f.lead_by === p.key} onPress={() => setF((x) => ({ ...x, lead_by: p.key, partner_id: x.lead_by === p.key ? x.partner_id : "", partner_name: x.lead_by === p.key ? x.partner_name : "" }))} testID={`lead-by-${p.key.toLowerCase().replace(/\s+/g, "-")}`} style={{ width: "47%", flexGrow: 1 }} />
            ))}
          </View>
          {viaPartner ? <PartnerChooser key={f.lead_by} value={f.partner_id || null} type={f.lead_by} label={`Select ${f.lead_by}`} onChange={(p) => setF((x) => ({ ...x, partner_id: p?.id ?? "", partner_name: p?.name ?? "" }))} testID="lead-partner" /> : null}
          {can("leads", "assign") && !editing ? (
            <ChoiceChips label="Assign to staff" value={staff.data?.find((x) => x.id === f.assigned_to_id)?.name ?? AUTO} options={[AUTO, ...(staff.data ?? []).map((x) => x.name)]} onChange={(n) => set("assigned_to_id")((staff.data ?? []).find((x) => x.name === n)?.id ?? "")} testID="lead-assign" />
          ) : null}
          <Text style={s.caption}>{viaPartner ? "The partner will see this lead (view-only) in their app." : "Walk-in, website, social media or other direct enquiry."}</Text>
        </View>
      ),
    },
    {
      key: "customer", title: "Customer Information", subtitle: viaPartner ? "Identify the customer with the last 4 digits only." : "Who is the lead? Add their contact details.",
      validate: () =>
        !f.full_name.trim() ? "Full name is required"
          : viaPartner && !isLast4(f.mobile_last4) ? "Enter the last 4 digits of the mobile number"
          : viaPartner && !isLast4(f.aadhaar_last4) ? "Enter the last 4 digits of the Aadhaar number"
          : !viaPartner && digits(f.mobile).length < 10 ? "Enter a valid 10-digit mobile number"
          : f.email && !/^\S+@\S+\.\S+$/.test(f.email) ? "Enter a valid email address" : undefined,
      summary: () => [{ label: "Full name", value: f.full_name }, ...(viaPartner ? [{ label: "Mobile", value: maskedMobile(f.mobile_last4) }, { label: "Aadhaar", value: maskedAadhaar(f.aadhaar_last4) }] : [{ label: "Mobile", value: f.mobile }]), { label: "Email", value: f.email }, { label: "Category", value: f.category }],
      render: () => (
        <View>
          <Field label="Full name" placeholder="Full Name" value={f.full_name} onChangeText={set("full_name")} icon="person-outline" testID="lead-name-input" />
          {viaPartner ? (
            <>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Field label="Mobile – last 4 digits" placeholder="e.g. 3210" value={f.mobile_last4} onChangeText={(v) => set("mobile_last4")(digits(v).slice(0, 4))} keyboardType="number-pad" maxLength={4} icon="call-outline" containerStyle={{ flex: 1 }} testID="lead-mobile-last4-input" />
                <Field label="Aadhaar – last 4 digits" placeholder="e.g. 4821" value={f.aadhaar_last4} onChangeText={(v) => set("aadhaar_last4")(digits(v).slice(0, 4))} keyboardType="number-pad" maxLength={4} icon="card-outline" containerStyle={{ flex: 1 }} testID="lead-aadhaar-last4-input" />
              </View>
              <Text style={[s.caption, { marginTop: -8, marginBottom: spacing.lg }]}>For partner leads the full mobile number is not captured — only the last 4 digits of the mobile and Aadhaar.</Text>
            </>
          ) : (
            <>
              <Field label="Mobile number" placeholder="10-digit mobile number" value={f.mobile} onChangeText={set("mobile")} keyboardType="phone-pad" icon="call-outline" testID="lead-mobile-input" />
            </>
          )}
          <Field label="Email address" placeholder="Email Address" value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" testID="lead-email-input" />
          <ChoiceChips label="Customer category" value={f.category} options={lookups.customer_categories} onChange={set("category")} testID="lead-category" />
        </View>
      ),
    },
    {
      key: "requirement", title: "Property Requirement", subtitle: "What is the customer looking for?",
      validate: () => (!f.configuration ? "Select the preferred configuration" : undefined),
      summary: () => [{ label: "Project", value: f.project }, { label: "Configuration", value: f.configuration }, { label: "City", value: f.city }, { label: "State", value: f.state }, { label: "Address", value: f.address }],
      render: () => (
        <View>
          <Select label="Project" value={f.project} options={["County Green"]} onChange={set("project")} icon="home-outline" testID="lead-project-select" />
          <ChoiceChips label="Preferred configuration" value={f.configuration} options={lookups.configurations} onChange={set("configuration")} testID="lead-config" />
          <Field label="Current address" placeholder="Address" value={f.address} onChangeText={set("address")} icon="location-outline" testID="lead-address-input" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Field label="City" placeholder="City" value={f.city} onChangeText={set("city")} containerStyle={{ flex: 1 }} testID="lead-city-input" />
            <View style={{ flex: 1 }}><Select label="State" value={f.state} options={STATES} onChange={set("state")} placeholder="State" testID="lead-state-select" /></View>
          </View>
        </View>
      ),
    },
    {
      key: "budget", title: "Budget & Lead Source", subtitle: "Help the sales team qualify this lead.",
      validate: () => (!f.source ? "Select the source of this lead" : undefined),
      summary: () => [{ label: "Budget", value: f.budget }, { label: "Source", value: f.source }, ...(editing ? [] : [{ label: "Temperature", value: f.temperature }])],
      render: () => (
        <View>
          <ChoiceChips label="Budget range" value={f.budget} options={BUDGETS} onChange={set("budget")} testID="lead-budget" />
          <ChoiceChips label="Source of lead" value={f.source} options={lookups.lead_sources} onChange={set("source")} testID="lead-source" />
          {editing ? null : (
            <View style={{ flexDirection: "row", gap: 10, marginTop: spacing.sm }}>
              {TEMPS.map((t) => <OptionTile key={t.k} label={t.k} icon={t.i} selected={f.temperature === t.k} onPress={() => set("temperature")(t.k)} testID={`lead-temp-${t.k.toLowerCase()}`} style={{ flex: 1 }} />)}
            </View>
          )}
        </View>
      ),
    },
    ...(editing ? [] : [{
      key: "followup", title: "Follow-up & Remarks", subtitle: "Plan the next touchpoint with the customer.",
      summary: () => [{ label: "Follow-up date", value: f.follow_up_date }, { label: "Time", value: f.follow_up_time }, { label: "Notes", value: f.notes }],
      render: () => (
        <View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Field label="Follow-up date" placeholder="DD MMM YYYY" value={f.follow_up_date} onChangeText={set("follow_up_date")} rightIcon="calendar-outline" containerStyle={{ flex: 1.2 }} testID="lead-followup-date" />
            <View style={{ flex: 1 }}><Select label="Time" value={f.follow_up_time} options={lookups.time_slots} onChange={set("follow_up_time")} placeholder="Time" testID="lead-followup-time" /></View>
          </View>
          <Field label="Notes / remarks" placeholder="Anything the sales team should know…" value={f.notes} onChangeText={set("notes")} multiline testID="lead-notes-input" />
        </View>
      ),
    } satisfies WizardStep]),
  ];

  return (
    <FormWizard
      testID={editing ? "edit-lead-screen" : "new-lead-screen"}
      title={editing ? "Edit Lead" : "New Lead"}
      done={!!done}
      onError={(m) => toast.show(m, "error")}
      onSubmit={() => save.mutate()}
      submitting={save.isPending}
      submitLabel={editing ? "Save changes" : "Submit lead"}
      success={{
        title: editing ? "Lead Updated" : "Lead Submitted",
        body: editing ? "The changes are saved and recorded in the lead's activity history." : viaPartner ? `The lead is added for ${f.partner_name}, who can now see it in their app.` : "The lead has been added to the pipeline as In Progress.",
        meta: done ? [{ label: "Customer", value: done.full_name }, { label: "Lead by", value: done.partner_name || "Direct" }, { label: "Assigned staff", value: done.assigned_to }] : [],
        primary: { label: "View lead", onPress: () => router.replace(`/leads/${done?.id}`), testID: "lead-success-view" },
        secondary: { label: "Back to leads", onPress: () => router.dismissTo("/(tabs)/leads"), testID: "lead-success-back" },
      }}
      steps={steps}
    />
  );
}
