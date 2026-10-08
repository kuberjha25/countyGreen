import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Share, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { post } from "@/src/api";
import { useCan } from "@/src/auth";
import { Badge, BottomNav, Button, Card, EmptyState, Field, Header, ScreenTitle, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { digits } from "@/src/format";
import { useLookups } from "@/src/lookups";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

// Upload format. Bulk-uploaded leads are direct leads (full mobile). Leads brought in by a
// CP / Broker / Influencer / Freelancer are added one by one (last-4-digit identification).
const COLUMNS: readonly { key: "full_name" | "mobile" | "email" | "category" | "configuration" | "source" | "city" | "state" | "notes" | "assigned_to"; label: string; required?: boolean }[] = [
  { key: "full_name", label: "Full Name", required: true },
  { key: "mobile", label: "Mobile", required: true },
  { key: "email", label: "Email" },
  { key: "category", label: "Customer Category" },
  { key: "configuration", label: "Preferred Configuration" },
  { key: "source", label: "Lead Source" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "notes", label: "Notes" },
  { key: "assigned_to", label: "Assigned Staff" },
];
type Row = Record<(typeof COLUMNS)[number]["key"], string>;

const TEMPLATE = [
  COLUMNS.map((c) => c.label).join(","),
  "Anil Kapoor,9876501234,anil@example.com,Individual,Plot,Website,Mohali,Punjab,Enquired via website form,Aman Verma",
  "Ritu Sharma,9876505678,,Investor,Plot,Social Media,Chandigarh,Chandigarh,Facebook campaign,",
].join("\n");

function splitLine(line: string, delim: string) {
  if (delim === "\t") return line.split("\t");
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    else if (ch === delim && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

// Accepts rows copied from Excel / Google Sheets (tab separated) or CSV text, with or without the header row.
function parse(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const delim = lines[0].includes("\t") ? "\t" : ",";
  let cells = lines.map((l) => splitLine(l, delim).map((c) => c.trim()));
  let keys: string[] = COLUMNS.map((c) => c.key);
  if (/name/i.test(cells[0][0] ?? "")) {
    keys = cells[0].map((h) => COLUMNS.find((c) => c.label.toLowerCase() === h.toLowerCase() || c.key === h.toLowerCase())?.key ?? "");
    cells = cells.slice(1);
  }
  return cells.map((r) => Object.fromEntries(COLUMNS.map((c) => [c.key, r[keys.indexOf(c.key)] ?? ""])) as Row);
}

// Screen · Bulk Lead Upload (leads "add" permission)
export default function BulkUpload() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const can = useCan();
  const lookups = useLookups();
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ created: number; skipped: { row: number; reason: string }[] } | null>(null);

  const checked = useMemo(() => {
    const seen = new Set<string>();
    return parse(text).map((r, i) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const m = digits(r.mobile).slice(-10);
      if (!r.full_name) errors.push("Full name missing");
      if (m.length !== 10) errors.push("Mobile must be 10 digits");
      else if (seen.has(m)) errors.push("Duplicate mobile in this file");
      seen.add(m);
      if (r.category && !lookups.customer_categories.includes(r.category)) warnings.push(`Category "${r.category}" is not in the master list`);
      if (r.configuration && !lookups.configurations.includes(r.configuration)) warnings.push(`Configuration "${r.configuration}" is not in the master list`);
      if (r.source && !lookups.lead_sources.includes(r.source)) warnings.push(`Source "${r.source}" is not in the master list`);
      return { row: i + 1, data: r, errors, warnings };
    });
  }, [text, lookups]);
  const valid = checked.filter((c) => !c.errors.length);

  const upload = useMutation({
    mutationFn: () => post<{ created: number; skipped: { row: number; reason: string }[] }>("/leads/bulk", { rows: valid.map((v) => v.data) }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["mis"] });
      setResult(r);
      setText("");
      toast.show(`${r.created} lead${r.created === 1 ? "" : "s"} imported`, "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const shareTemplate = async () => {
    try {
      await Share.share({ title: "County Green lead upload template", message: TEMPLATE });
    } catch {
      toast.show("Sharing is not available here — copy the columns shown below", "info");
    }
  };

  if (!can("leads", "add")) {
    return (
      <View style={s.screen}>
        <Header title="Bulk Upload" />
        <EmptyState icon="lock-closed-outline" title="Not available" body="Your role cannot add leads." />
      </View>
    );
  }

  return (
    <View style={s.screen} testID="bulk-upload-screen">
      <Header title="Bulk Upload" />
      <KeyboardAwareScrollView bottomOffset={40} contentContainerStyle={[s.content, { paddingTop: 8, paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
        <ScreenTitle title="Bulk Lead Upload" subtitle="Import many leads at once. Rows are added as direct leads and assigned to staff automatically unless an Assigned Staff name is given." />

        <SectionLabel>1 · Upload format</SectionLabel>
        <Card>
          <View style={styles.cols}>
            {COLUMNS.map((c) => <Badge key={c.key} label={c.required ? `${c.label} *` : c.label} tone={c.required ? "gold" : "muted"} small />)}
          </View>
          <Text style={[s.caption, { marginTop: spacing.md }]}>Keep the columns in this order. Mobile must be 10 digits. Category, configuration and source should match the master lists. Partner leads (CP / Broker / Influencer / Freelancer) are added individually from New Lead.</Text>
          <Button label="Share template" icon="share-outline" variant="secondary" small onPress={shareTemplate} style={{ marginTop: spacing.md }} testID="bulk-template-button" />
        </Card>

        <SectionLabel style={{ marginTop: spacing.xl }}>2 · Paste rows</SectionLabel>
        <Field placeholder={"Copy the rows from Excel / Google Sheets or a CSV file and paste here.\n\n" + TEMPLATE.split("\n").slice(0, 2).join("\n")} value={text} onChangeText={(v) => { setText(v); setResult(null); }} multiline style={{ minHeight: 160, fontSize: 13 }} autoCapitalize="none" autoCorrect={false} testID="bulk-paste-input" />
        {text ? <Button label="Clear" variant="ghost" small onPress={() => setText("")} style={{ alignSelf: "flex-start", marginTop: -8 }} testID="bulk-clear-button" /> : null}

        {checked.length ? (
          <>
            <SectionLabel style={{ marginTop: spacing.lg }}>3 · Review</SectionLabel>
            <View style={[s.row, { gap: 8, marginBottom: spacing.md }]}>
              <Badge label={`${valid.length} ready`} tone="success" />
              {checked.length - valid.length ? <Badge label={`${checked.length - valid.length} with errors`} tone="error" /> : null}
            </View>
            <View style={{ gap: 8 }}>
              {checked.map((c) => (
                <View key={c.row} style={[styles.row, !!c.errors.length && { borderColor: colors.error }]} testID={`bulk-row-${c.row}`}>
                  <Text style={styles.rowNo}>{c.row}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name} numberOfLines={1}>{c.data.full_name || "—"}</Text>
                    <Text style={s.caption} numberOfLines={1}>{[c.data.mobile, c.data.source, c.data.city, c.data.assigned_to && `→ ${c.data.assigned_to}`].filter(Boolean).join(" · ")}</Text>
                    {c.errors.map((e) => <Text key={e} style={styles.err}>{e}</Text>)}
                    {c.warnings.map((w) => <Text key={w} style={styles.warn}>{w}</Text>)}
                  </View>
                  <Ionicons name={c.errors.length ? "close-circle" : "checkmark-circle"} size={20} color={c.errors.length ? colors.error : colors.success} />
                </View>
              ))}
            </View>
            <Button label={`Import ${valid.length} lead${valid.length === 1 ? "" : "s"}`} icon="cloud-upload-outline" variant="gold" disabled={!valid.length} onPress={() => upload.mutate()} loading={upload.isPending} style={{ marginTop: spacing.lg }} testID="bulk-import-button" />
          </>
        ) : null}

        {result ? (
          <Card style={{ marginTop: spacing.xl }} testID="bulk-result">
            <Text style={s.h3}>{result.created} lead{result.created === 1 ? "" : "s"} imported</Text>
            {result.skipped.map((x) => <Text key={x.row} style={[s.caption, { marginTop: 4 }]}>Row {x.row}: {x.reason}</Text>)}
            <Button label="View leads" icon="arrow-forward" small onPress={() => router.dismissTo("/(tabs)/leads")} style={{ marginTop: spacing.md }} testID="bulk-view-leads" />
          </Card>
        ) : null}
      </KeyboardAwareScrollView>
      <BottomNav active="leads" />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  cols: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary },
  rowNo: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted, width: 20, marginTop: 2 },
  err: { fontFamily: fonts.body, fontSize: 12, color: colors.error, marginTop: 2 },
  warn: { fontFamily: fonts.body, fontSize: 12, color: colors.warning, marginTop: 2 },
}));
