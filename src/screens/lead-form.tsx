import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { errorMessage } from "@/src/api";
import { STATES } from "@/src/brand";
import { ReferenceChooser } from "@/src/components/partners";
import { ChoiceChips, ErrorState, Field, Header, Loading, OptionTile, Select, useScreenStyles } from "@/src/components/ui";
import { FormWizard, WizardStep } from "@/src/components/wizard";
import { digits } from "@/src/format";
import { useCategories, useProjects, useSources } from "@/src/lookups";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { createLead, fetchLead, LeadInput, updateLead } from "@/src/store/leadsSlice";
import { useRun } from "@/src/store/useRun";
import { spacing } from "@/src/theme";
import { useToast } from "@/src/toast";
import { isMasked, LeadDetail, Reference } from "@/src/types";

const TEMPS = [{ k: "hot", label: "Hot", i: "flame-outline" }, { k: "warm", label: "Warm", i: "sunny-outline" }, { k: "cold", label: "Cold", i: "snow-outline" }] as const;
type Form = { partner: Reference | null; full_name: string; mobile: string; email: string; lead_type: string; project: string; category: string; budget: string; source: string; address: string; city: string; state: string; remarks: string };
const EMPTY: Form = { partner: null, full_name: "", mobile: "", email: "", lead_type: "warm", project: "", category: "", budget: "", source: "", address: "", city: "", state: "", remarks: "" };

// Screen 15 · New Lead / Edit Lead (POST / PUT /api/leads) — staff add leads, also on behalf of a partner.
export default function LeadFormScreen() {
  const s = useScreenStyles();
  const dispatch = useAppDispatch();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const entry = useAppSelector((st) => (id ? st.leads.byId[Number(id)] : undefined));
  useEffect(() => {
    if (id) dispatch(fetchLead(Number(id)));
  }, [dispatch, id]);
  if (!id) return <LeadForm initial={EMPTY} />;
  if (!entry?.data) {
    return (
      <View style={s.screen}>
        <Header title="Edit Lead" showBell={false} />
        {entry?.status === "failed" ? <ErrorState message={entry.error ?? "Lead not found"} onRetry={() => dispatch(fetchLead(Number(id)))} /> : <Loading />}
      </View>
    );
  }
  return <LeadForm id={Number(id)} lead={entry.data} initial={fromLead(entry.data)} />;
}

const fromLead = (l: LeadDetail): Form => ({
  ...EMPTY,
  full_name: l.full_name ?? "",
  mobile: isMasked(l.mobile) ? "" : l.mobile ?? "", // masked numbers are left out of the update
  email: isMasked(l.email) ? "" : l.email ?? "",
  lead_type: l.lead_type ?? "warm",
  project: l.project_name ?? "",
  category: l.unit_category ?? "",
  budget: l.budget ?? "",
  source: l.source ?? "",
  address: l.address ?? "",
  city: l.city ?? "",
  state: l.state ?? "",
  remarks: l.remarks ?? "",
});

function LeadForm({ id, lead, initial }: { id?: number; lead?: LeadDetail; initial: Form }) {
  const s = useScreenStyles();
  const router = useRouter();
  const toast = useToast();
  const projects = useProjects();
  const categories = useCategories();
  const sources = useSources();
  const editing = !!id;
  const [f, setF] = useState<Form>(initial);
  const set = (k: keyof Form) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const [done, setDone] = useState<LeadDetail | null>(null);
  const [run, saving] = useRun();

  const projectId = projects.data?.find((p) => p.name === f.project)?.id;
  const categoryId = categories.data?.find((c) => c.name === f.category)?.id;
  const sourceId = sources.data?.find((o) => o.name === f.source)?.id;
  const maskedMobile = editing && isMasked(lead?.mobile);

  const body = (): Partial<LeadInput> => {
    const b: Partial<LeadInput> = {
      full_name: f.full_name.trim(),
      lead_type: f.lead_type,
      email: f.email.trim() || undefined,
      source: sourceId !== undefined ? String(sourceId) : undefined,
      unit_category: categoryId !== undefined ? Number(categoryId) : undefined,
      budget: f.budget ? Number(digits(f.budget)) : undefined,
      project_id: projectId,
      address: f.address.trim() || undefined,
      city: f.city.trim() || undefined,
      state: f.state || undefined,
      remarks: f.remarks.trim() || undefined,
    };
    if (f.mobile) b.mobile = digits(f.mobile);
    if (!editing && f.partner) b.partner_id = f.partner.id;
    return b;
  };

  const submit = async () => {
    try {
      const l = await run<LeadDetail>(editing ? updateLead({ id: id!, body: body() }) : createLead(body() as LeadInput));
      setDone(l ?? ({ id } as LeadDetail));
    } catch (e) {
      toast.show(errorMessage(e), "error");
    }
  };

  const steps: WizardStep[] = [
    ...(editing
      ? []
      : [
          {
            key: "source",
            title: "Lead By",
            subtitle: "Was this customer brought in by a CP, broker, influencer or freelancer?",
            summary: () => [{ label: "Lead by", value: f.partner ? f.partner.name : "Direct (no partner)" }],
            render: () => (
              <View>
                <ReferenceChooser value={f.partner} onChange={(p) => setF((x) => ({ ...x, partner: p }))} noneLabel="Direct (no partner)" label="Partner who brought the customer" testID="lead-partner" />
                <Text style={s.caption}>{f.partner ? "The partner will see this lead (view-only) in their app." : "Walk-in, website, social media or other direct enquiry."}</Text>
              </View>
            ),
          } satisfies WizardStep,
        ]),
    {
      key: "customer",
      title: "Customer Information",
      subtitle: "Who is the lead? Add their contact details.",
      validate: () =>
        !f.full_name.trim() ? "Full name is required"
          : f.mobile && digits(f.mobile).length !== 10 ? "Enter a valid 10-digit mobile number"
          : !f.mobile && !maskedMobile ? "Mobile number is required"
          : f.email && !/^\S+@\S+\.\S+$/.test(f.email) ? "Enter a valid email address" : undefined,
      summary: () => [{ label: "Full name", value: f.full_name }, { label: "Mobile", value: f.mobile || lead?.mobile }, { label: "Email", value: f.email }, { label: "Lead type", value: TEMPS.find((t) => t.k === f.lead_type)?.label }],
      render: () => (
        <View>
          <Field label="Full name" placeholder="Full Name" value={f.full_name} onChangeText={set("full_name")} icon="person-outline" testID="lead-name-input" />
          <Field label="Mobile number" placeholder={maskedMobile ? `${lead?.mobile} (leave empty to keep)` : "10-digit mobile number"} value={f.mobile} onChangeText={(v) => set("mobile")(digits(v).slice(0, 10))} keyboardType="number-pad" maxLength={10} icon="call-outline" testID="lead-mobile-input" />
          <Field label="Email address" placeholder="Email Address" value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" testID="lead-email-input" />
          <View style={{ flexDirection: "row", gap: 10, marginBottom: spacing.lg }}>
            {TEMPS.map((t) => <OptionTile key={t.k} label={t.label} icon={t.i} selected={f.lead_type === t.k} onPress={() => set("lead_type")(t.k)} testID={`lead-temp-${t.k}`} style={{ flex: 1 }} />)}
          </View>
        </View>
      ),
    },
    {
      key: "requirement",
      title: "Property Requirement",
      subtitle: "What is the customer looking for?",
      validate: () => (f.budget && !/^\d+$/.test(digits(f.budget)) ? "Budget must be a number" : undefined),
      summary: () => [{ label: "Project", value: f.project }, { label: "Unit category", value: f.category }, { label: "Budget (₹)", value: f.budget }],
      render: () => (
        <View>
          <Select label="Project" value={f.project} options={(projects.data ?? []).map((p) => p.name)} onChange={set("project")} placeholder={projects.status === "loading" ? "Loading…" : "Select project"} icon="home-outline" testID="lead-project-select" />
          <ChoiceChips label="Unit category" value={f.category} options={(categories.data ?? []).map((c) => c.name)} onChange={set("category")} testID="lead-category" />
          <Field label="Budget (₹)" placeholder="e.g. 15000000" value={f.budget} onChangeText={(v) => set("budget")(digits(v))} keyboardType="number-pad" icon="cash-outline" testID="lead-budget-input" />
        </View>
      ),
    },
    {
      key: "more",
      title: "Source & Address",
      subtitle: "Where the lead came from and where the customer lives.",
      validate: () => (f.remarks.length > 500 ? "Remarks can be at most 500 characters" : undefined),
      summary: () => [{ label: "Source", value: f.source }, { label: "Address", value: [f.address, f.city, f.state].filter(Boolean).join(", ") }, { label: "Remarks", value: f.remarks }],
      render: () => (
        <View>
          <ChoiceChips label="Source of lead" value={f.source} options={(sources.data ?? []).map((o) => o.name)} onChange={set("source")} testID="lead-source" />
          <Field label="Address" placeholder="Address" value={f.address} onChangeText={set("address")} icon="location-outline" testID="lead-address-input" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Field label="City" placeholder="City" value={f.city} onChangeText={set("city")} containerStyle={{ flex: 1 }} testID="lead-city-input" />
            <View style={{ flex: 1 }}><Select label="State" value={f.state} options={STATES.includes(f.state) || !f.state ? STATES : [f.state, ...STATES]} onChange={set("state")} placeholder="State" testID="lead-state-select" /></View>
          </View>
          <Field label="Remarks" placeholder="Anything the sales team should know…" value={f.remarks} onChangeText={set("remarks")} multiline maxLength={500} testID="lead-notes-input" />
        </View>
      ),
    },
  ];

  return (
    <FormWizard
      testID={editing ? "edit-lead-screen" : "new-lead-screen"}
      title={editing ? "Edit Lead" : "New Lead"}
      done={!!done}
      onError={(m) => toast.show(m, "error")}
      onSubmit={submit}
      submitting={saving}
      submitLabel={editing ? "Save changes" : "Submit lead"}
      success={{
        title: editing ? "Lead Updated" : "Lead Submitted",
        body: editing ? "The changes are saved." : f.partner ? `The lead is added for ${f.partner.name}, who can now see it in their app.` : "The lead has been added.",
        meta: done ? [{ label: "Customer", value: done.full_name ?? f.full_name }, { label: "Lead by", value: f.partner?.name ?? "Direct" }] : [],
        primary: { label: "View lead", onPress: () => router.replace(`/leads/${done?.id ?? id}`), testID: "lead-success-view" },
        secondary: { label: "Back to leads", onPress: () => router.dismissTo("/(tabs)/leads"), testID: "lead-success-back" },
      }}
      steps={steps}
    />
  );
}

