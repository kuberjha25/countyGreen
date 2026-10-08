import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { get, post } from "@/src/api";
import { isStaff } from "@/src/access";
import { useAuth, useCan } from "@/src/auth";
import { PARTNER_TYPES, partnerShort } from "@/src/brand";
import { activeFilterCount, Avatar, Badge, Button, Checkbox, ChipRow, EmptyState, ErrorState, FAB, FILTER_ALL, FilterSheet, FilterValues, Header, Loading, PickerSheet, SearchBar, useScreenStyles } from "@/src/components/ui";
import { contactOf, parseDate, startOfDay } from "@/src/format";
import { useLookups, useStaff } from "@/src/lookups";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

const TABS = ["All", "In Progress", "Converted", "Not Matured"] as const;
const ADDED = ["Today", "Last 7 days", "Last 30 days", "Last 90 days"];
const FOLLOW_UP = ["Overdue", "Today", "Next 7 days"];
const DAY = 86400000;
const FILTER_KEYS = ["added", "follow_up", "category", "source", "configuration", "partner_type", "partner_name", "assigned_to", "temperature", "follow_up_time", "project"];

const tabFrom = (p: Record<string, string>) => (p.status && TABS.includes(p.status as any) ? p.status : "All");
const filtersFrom = (p: Record<string, string>): FilterValues => Object.fromEntries(FILTER_KEYS.filter((k) => p[k]).map((k) => [k, p[k]]));

function matchesAdded(created: string | undefined, f: string) {
  const d = parseDate(created);
  if (!d) return false;
  const today = startOfDay(new Date()).getTime();
  const days = { Today: 0, "Last 7 days": 6, "Last 30 days": 29, "Last 90 days": 89 }[f] ?? 0;
  return d.getTime() >= today - days * DAY;
}

function matchesFollowUp(date: string | undefined, f: string) {
  const d = parseDate(date);
  if (!d) return false;
  const day = startOfDay(d).getTime();
  const today = startOfDay(new Date()).getTime();
  if (f === "Overdue") return day < today;
  if (f === "Today") return day === today;
  return day >= today && day <= today + 7 * DAY;
}

// Screen 12 · Leads — partners: view-only list of their own leads; staff: add, filter and reassign.
export default function Leads() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const lookups = useLookups();
  const { user } = useAuth();
  const can = useCan();
  const staffView = isStaff(user);
  const params = useLocalSearchParams<Record<string, string>>();
  const [tab, setTab] = useState<string>(() => tabFrom(params));
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<FilterValues>(() => filtersFrom(params));
  const [showFilters, setShowFilters] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [picking, setPicking] = useState(false);
  const leads = useQuery({ queryKey: ["leads"], queryFn: () => get<any[]>("/leads") });
  const staff = useStaff(can("leads", "reassign"));

  // Dashboard / MIS links open this tab with ?status=…&source=… etc.
  const paramKey = JSON.stringify(params);
  const [seenParams, setSeenParams] = useState(paramKey);
  if (seenParams !== paramKey) {
    setSeenParams(paramKey);
    if (params.status) {
      setTab(tabFrom(params));
      setFilters(filtersFrom(params));
    }
  }

  const uniq = (k: string) => [...new Set((leads.data ?? []).map((l) => l[k]).filter(Boolean))].sort() as string[];
  const groups = [
    { key: "added", label: "Date added", options: ADDED },
    { key: "follow_up", label: "Follow-up date", options: FOLLOW_UP },
    { key: "follow_up_time", label: "Follow-up time slot", options: lookups.time_slots },
    { key: "category", label: "Customer category", options: lookups.customer_categories },
    { key: "source", label: "Lead source", options: lookups.lead_sources },
    { key: "configuration", label: "Preferred configuration", options: lookups.configurations },
    { key: "project", label: "Project", options: uniq("project") },
    { key: "temperature", label: "Temperature", options: ["Hot", "Warm", "Cold"] },
    ...(staffView
      ? [
          { key: "partner_type", label: "Lead by (partner type)", options: [...PARTNER_TYPES.map((p) => p.key), "Direct"] },
          { key: "partner_name", label: "CP / Freelancer / Influencer", options: uniq("partner_name") },
          { key: "assigned_to", label: "Assigned staff", options: uniq("assigned_to") },
        ]
      : []),
  ];
  const on = (k: string) => filters[k] && filters[k] !== FILTER_ALL;

  // Search + filters first; the status chips then count within that result.
  const base = (leads.data ?? []).filter(
    (l) =>
      (!q || l.full_name.toLowerCase().includes(q.toLowerCase()) || (l.mobile ?? "").replace(/\s/g, "").includes(q.replace(/\s/g, "")) || (q.length >= 3 && `${l.mobile_last4 ?? ""} ${l.aadhaar_last4 ?? ""}`.includes(q))) &&
      (!on("added") || matchesAdded(l.created_at, filters.added)) &&
      (!on("follow_up") || matchesFollowUp(l.follow_up_date, filters.follow_up)) &&
      (!on("partner_type") || (filters.partner_type === "Direct" ? !l.partner_type : l.partner_type === filters.partner_type)) &&
      ["category", "source", "configuration", "partner_name", "assigned_to", "temperature", "follow_up_time", "project"].every((k) => !on(k) || l[k] === filters[k]),
  );
  const counts: Record<string, number> = { All: base.length };
  base.forEach((l) => (counts[l.status] = (counts[l.status] ?? 0) + 1));
  const filtered = base.filter((l) => tab === "All" || l.status === tab);
  const filterCount = activeFilterCount(filters);
  const visibleIds = useMemo(() => filtered.map((l) => l.id), [filtered]);

  const reassign = useMutation({
    mutationFn: (staffId: string) => post<{ updated: number; staff: string }>("/leads/reassign", { ids: selected, staff_id: staffId }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["lead"] });
      qc.invalidateQueries({ queryKey: ["mis"] });
      toast.show(r.updated ? `${r.updated} lead${r.updated === 1 ? "" : "s"} reassigned to ${r.staff}` : `Already assigned to ${r.staff}`, "success");
      setSelecting(false);
      setSelected([]);
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const toggle = (id: string) => setSelected((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  const allSelected = visibleIds.length > 0 && visibleIds.every((x) => selected.includes(x));

  const headerRight = (
    <View style={[s.row, { gap: 10 }]}>
      {can("leads", "reassign") ? (
        <Pressable onPress={() => { setSelecting((v) => !v); setSelected([]); }} hitSlop={8} testID="leads-select-button">
          <Text style={s.link}>{selecting ? "Cancel" : "Select"}</Text>
        </Pressable>
      ) : null}
      {can("leads", "add") && !selecting ? <Pressable onPress={() => router.push("/leads/new")} style={styles.addBtn} testID="leads-add-button"><Ionicons name="add" size={22} color={colors.onBrandSecondary} /></Pressable> : null}
    </View>
  );

  return (
    <View style={s.screen} testID="leads-screen">
      <Header showBack={false} showBell={!can("leads", "add") && !can("leads", "reassign")} right={can("leads", "add") || can("leads", "reassign") ? headerRight : undefined} />
      <View style={s.content}>
        <Text style={[s.h2, { fontSize: 30 }]}>{staffView ? "Leads" : "My Leads"}</Text>
        <Text style={[s.bodyMuted, { marginBottom: spacing.md }]}>{staffView ? "Add leads for partners, follow up and reassign." : "Leads added for you by the County Green team. View only."}</Text>
        <SearchBar value={q} onChange={setQ} placeholder="Search name, phone or last 4 digits" testID="leads-search" onFilter={() => setShowFilters(true)} filterCount={filterCount} />
      </View>
      <ChipRow options={[...TABS]} value={tab as (typeof TABS)[number]} onChange={setTab} counts={counts} testIDPrefix="leads-tab" />
      {leads.isLoading ? (
        <Loading />
      ) : leads.isError ? (
        <ErrorState message={(leads.error as Error).message} onRetry={leads.refetch} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: 4, paddingBottom: selecting ? 120 : 100, gap: 10 }}
          refreshControl={<RefreshControl refreshing={leads.isRefetching} onRefresh={leads.refetch} tintColor={colors.brandPrimary} />}
          ListHeaderComponent={
            <View style={[s.between, { marginBottom: 6, gap: 10 }]}>
              {selecting ? (
                <Checkbox checked={allSelected} label={allSelected ? "Unselect all" : `Select all (${visibleIds.length})`} onPress={() => setSelected(allSelected ? [] : visibleIds)} testID="leads-select-all" />
              ) : (
                <Text style={[s.caption, { flex: 1 }]}>{filtered.length} lead{filtered.length === 1 ? "" : "s"} · Sorted by latest activity</Text>
              )}
              {filterCount ? (
                <Pressable onPress={() => setFilters({})} hitSlop={8} testID="leads-clear-filters">
                  <Text style={s.link}>Clear filters</Text>
                </Pressable>
              ) : can("leads", "add") && !selecting ? (
                <Pressable onPress={() => router.push("/leads/bulk")} hitSlop={8} style={s.row} testID="leads-bulk-link">
                  <Ionicons name="cloud-upload-outline" size={14} color={colors.brandPrimary} />
                  <Text style={[s.link, { marginLeft: 4 }]}>Bulk upload</Text>
                </Pressable>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            filterCount || q ? (
              <EmptyState icon="options-outline" title="No leads match" body="Try changing the search or filters." action={<Button label="Clear filters" small variant="secondary" onPress={() => { setFilters({}); setQ(""); }} testID="leads-empty-clear" />} />
            ) : can("leads", "add") ? (
              <EmptyState icon="people-outline" title="No leads in this stage yet" body="Leads you add will appear here with their status and follow-up." action={<Button label="Add new lead" small onPress={() => router.push("/leads/new")} testID="leads-empty-add" />} />
            ) : (
              <EmptyState icon="people-outline" title="No leads yet" body="When you bring a customer to the County Green office, our team adds the lead for you and it appears here." />
            )
          }
          renderItem={({ item: l }) => {
            const sel = selected.includes(l.id);
            return (
              <Pressable onPress={() => (selecting ? toggle(l.id) : router.push(`/leads/${l.id}`))} style={({ pressed }) => [styles.card, sel && styles.cardSel, pressed && { opacity: 0.9 }]} testID={`lead-card-${l.id}`}>
                {selecting ? <View style={{ paddingTop: 10 }}><Ionicons name={sel ? "checkbox" : "square-outline"} size={22} color={sel ? colors.brandPrimary : colors.muted} /></View> : <Avatar name={l.full_name} />}
                <View style={{ flex: 1 }}>
                  <View style={s.between}>
                    <Text style={[s.name, { flex: 1 }]} numberOfLines={1}>{l.full_name}</Text>
                    <Badge label={l.temperature} small />
                  </View>
                  <Text style={s.meta} numberOfLines={1}>{contactOf(l) || "—"} · {l.configuration || "Config TBD"}{l.category ? ` · ${l.category}` : ""}</Text>
                  <View style={[s.row, { gap: 6, marginTop: 6, flexWrap: "wrap" }]}>
                    {l.partner_type ? <Badge label={partnerShort(l.partner_type)} tone="gold" small /> : <Badge label="Direct" small />}
                    <Text style={[s.caption, { flexShrink: 1 }]} numberOfLines={1}>{l.partner_name || l.source || "—"}</Text>
                  </View>
                  <View style={[s.row, { marginTop: 4 }]}>
                    <Ionicons name="person-circle-outline" size={13} color={colors.muted} />
                    <Text style={[s.caption, { marginLeft: 4 }]} numberOfLines={1}>Staff: {l.assigned_to || "Not assigned yet"}</Text>
                  </View>
                  <View style={[s.between, { marginTop: 8 }]}>
                    <View style={s.row}>
                      <Ionicons name="time-outline" size={13} color={colors.muted} />
                      <Text style={[s.caption, { marginLeft: 4 }]}>Follow-up {l.follow_up_date || "—"}</Text>
                    </View>
                    <Badge label={l.status} small />
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
      {selecting ? (
        <View style={styles.selBar} testID="leads-selection-bar">
          <Text style={[styles.selText, { flex: 1 }]}>{selected.length} selected</Text>
          <Button label="Reassign" icon="swap-horizontal-outline" small disabled={!selected.length} loading={reassign.isPending} onPress={() => setPicking(true)} testID="leads-reassign-button" />
        </View>
      ) : can("leads", "add") ? (
        <FAB onPress={() => router.push("/leads/new")} testID="leads-fab" />
      ) : null}
      <PickerSheet visible={picking} onClose={() => setPicking(false)} title={`Reassign ${selected.length} lead${selected.length === 1 ? "" : "s"} to`} options={(staff.data ?? []).map((x) => ({ value: x.id, label: x.name, sub: x.role_name }))} onPick={(v) => reassign.mutate(v)} testID="leads-reassign" />
      <FilterSheet visible={showFilters} onClose={() => setShowFilters(false)} groups={groups} value={filters} onApply={setFilters} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14 },
  cardSel: { borderColor: colors.brandPrimary, backgroundColor: colors.forestSoft },
  selBar: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: 16, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, shadowColor: colors.forestDeep, shadowOpacity: 0.15, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  selText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.onSurface },
}));
