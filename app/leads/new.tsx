import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

import { post } from "@/src/api";
import { CATEGORIES, CONFIGURATIONS, LEAD_SOURCES, STATES, TIME_SLOTS } from "@/src/brand";
import { Field, OptionTile, Select } from "@/src/components/ui";
import { FormWizard } from "@/src/components/wizard";
import { spacing } from "@/src/theme";
import { useToast } from "@/src/toast";

const BUDGETS = ["Under ₹50 L", "₹50 L – ₹1 Cr", "₹1 Cr – ₹2 Cr", "₹2 Cr – ₹3 Cr", "Above ₹3 Cr", "To be discussed"];
const TEMPS = [{ k: "Hot", i: "flame-outline" }, { k: "Warm", i: "sunny-outline" }, { k: "Cold", i: "snow-outline" }] as const;

// Screen 15 · New Lead — 4 steps + Review + Success
export default function NewLead() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const { demo } = useLocalSearchParams<{ demo?: string }>();
  const [f, setF] = useState(
    demo === "1"
      ? { full_name: "Rajesh Kumar", mobile: "98765 43210", email: "rajesh.kumar@example.com", category: "Individual", address: "12, Sector 40", city: "Chandigarh", state: "Chandigarh", project: "County Green", configuration: "3 BHK", budget: "₹1 Cr – ₹2 Cr", source: "Reference", temperature: "Hot", follow_up_date: "12 Sep 2026", follow_up_time: "11:00 AM", notes: "Looking for a 3 BHK close to the club house. Shared brochure." }
      : { full_name: "", mobile: "", email: "", category: "", address: "", city: "", state: "", project: "County Green", configuration: "", budget: "", source: "", temperature: "Warm", follow_up_date: "", follow_up_time: "", notes: "" },
  );
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const [created, setCreated] = useState<any>(null);

  const create = useMutation({
    mutationFn: () => post("/leads", { ...f, follow_up_date: f.follow_up_date || null }),
    onSuccess: (lead) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["mis"] });
      setCreated(lead);
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  return (
    <FormWizard
      testID="new-lead-screen"
      title="New Lead"
      done={!!created}
      onError={(m) => toast.show(m, "error")}
      onSubmit={() => create.mutate()}
      submitting={create.isPending}
      submitLabel="Submit lead"
      success={{
        title: "Lead Submitted",
        body: "The lead has been added to your pipeline as In Progress. You can update its status and follow-up any time.",
        meta: created ? [{ label: "Customer", value: created.full_name }, { label: "Project", value: created.project }, { label: "Status", value: created.status }] : [],
        primary: { label: "View lead", onPress: () => router.replace(`/leads/${created?.id}`), testID: "lead-success-view" },
        secondary: { label: "Back to leads", onPress: () => router.replace("/(tabs)/leads"), testID: "lead-success-back" },
      }}
      steps={[
        {
          key: "customer", title: "Customer Information", subtitle: "Who is the lead? Add their contact details.",
          validate: () => (!f.full_name.trim() ? "Full name is required" : f.mobile.replace(/\D/g, "").length < 10 ? "Enter a valid 10-digit mobile number" : f.email && !/^\S+@\S+\.\S+$/.test(f.email) ? "Enter a valid email address" : undefined),
          summary: () => [{ label: "Full name", value: f.full_name }, { label: "Mobile", value: f.mobile }, { label: "Email", value: f.email }, { label: "Category", value: f.category }],
          render: () => (
            <View>
              <Field label="Full name" placeholder="Full Name" value={f.full_name} onChangeText={set("full_name")} icon="person-outline" testID="lead-name-input" />
              <Field label="Mobile number" placeholder="10-digit mobile number" value={f.mobile} onChangeText={set("mobile")} keyboardType="phone-pad" icon="call-outline" testID="lead-mobile-input" />
              <Field label="Email address" placeholder="Email Address" value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" testID="lead-email-input" />
              <Select label="Customer category" value={f.category} options={CATEGORIES} onChange={set("category")} placeholder="Select category" icon="pricetag-outline" testID="lead-category-select" />
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
              <Select label="Preferred configuration" value={f.configuration} options={CONFIGURATIONS} onChange={set("configuration")} placeholder="Select configuration" icon="grid-outline" testID="lead-config-select" />
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
          summary: () => [{ label: "Budget", value: f.budget }, { label: "Source", value: f.source }, { label: "Temperature", value: f.temperature }],
          render: () => (
            <View>
              <Select label="Budget range" value={f.budget} options={BUDGETS} onChange={set("budget")} placeholder="Select budget" icon="cash-outline" testID="lead-budget-select" />
              <Select label="Source of lead" value={f.source} options={LEAD_SOURCES} onChange={set("source")} placeholder="Select source" icon="share-social-outline" testID="lead-source-select" />
              <View style={{ flexDirection: "row", gap: 10, marginTop: spacing.sm }}>
                {TEMPS.map((t) => <OptionTile key={t.k} label={t.k} icon={t.i} selected={f.temperature === t.k} onPress={() => set("temperature")(t.k)} testID={`lead-temp-${t.k.toLowerCase()}`} style={{ flex: 1 }} />)}
              </View>
            </View>
          ),
        },
        {
          key: "followup", title: "Follow-up & Remarks", subtitle: "Plan the next touchpoint with the customer.",
          summary: () => [{ label: "Follow-up date", value: f.follow_up_date }, { label: "Time", value: f.follow_up_time }, { label: "Notes", value: f.notes }],
          render: () => (
            <View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Field label="Follow-up date" placeholder="DD MMM YYYY" value={f.follow_up_date} onChangeText={set("follow_up_date")} rightIcon="calendar-outline" containerStyle={{ flex: 1.2 }} testID="lead-followup-date" />
                <View style={{ flex: 1 }}><Select label="Time" value={f.follow_up_time} options={TIME_SLOTS} onChange={set("follow_up_time")} placeholder="Time" testID="lead-followup-time" /></View>
              </View>
              <Field label="Notes / remarks" placeholder="Anything the sales team should know…" value={f.notes} onChangeText={set("notes")} multiline testID="lead-notes-input" />
            </View>
          ),
        },
      ]}
    />
  );
}
