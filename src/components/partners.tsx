import Ionicons from "@react-native-vector-icons/ionicons";
import React, { useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";

import { post } from "@/src/api";
import { partnerShort } from "@/src/brand";
import { Avatar, Badge, Field, SearchBar, useScreenStyles } from "@/src/components/ui";
import { digits, waNumber } from "@/src/format";
import { Partner, usePartners } from "@/src/lookups";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

// Inline (no modal) partner picker, so it can sit inside forms and bottom sheets.
export function PartnerChooser({
  value,
  onChange,
  type,
  noneLabel,
  label = "CP / Broker / Influencer / Freelancer",
  error,
  testID = "partner-chooser",
}: {
  value?: string | null;
  onChange: (p: Partner | null) => void;
  type?: string; // limit to one partner type
  noneLabel?: string; // when set, a "no partner" choice is offered
  label?: string;
  error?: string;
  testID?: string;
}) {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const partners = usePartners();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(!value);
  const all = (partners.data ?? []).filter((p) => !type || p.partner_type === type);
  const selected = (partners.data ?? []).find((p) => p.id === value);
  const list = all.filter((p) => !q || `${p.name} ${p.company ?? ""} ${p.mobile}`.toLowerCase().includes(q.toLowerCase())).slice(0, 6);

  return (
    <View style={{ marginBottom: spacing.lg }} testID={testID}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      {!open && (selected || (!value && noneLabel)) ? (
        <View style={[styles.row, styles.rowSel]}>
          {selected ? <Avatar name={selected.name} size={36} tone="gold" /> : <View style={styles.noneIcon}><Ionicons name="person-outline" size={18} color={colors.brandPrimary} /></View>}
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{selected ? selected.name : noneLabel}</Text>
            {selected ? <Text style={s.meta}>{[partnerShort(selected.partner_type), selected.company, selected.mobile].filter(Boolean).join(" · ")}</Text> : null}
          </View>
          <Pressable onPress={() => setOpen(true)} hitSlop={8} testID={`${testID}-change`}><Text style={s.link}>Change</Text></Pressable>
        </View>
      ) : (
        <View style={[styles.box, !!error && { borderColor: colors.error }]}>
          <SearchBar value={q} onChange={setQ} placeholder="Search by name, firm or mobile" testID={`${testID}-search`} />
          <View style={{ marginTop: spacing.sm }}>
            {noneLabel ? (
              <Pressable onPress={() => { onChange(null); setOpen(false); }} style={[styles.row, !value && styles.rowSel]} testID={`${testID}-none`}>
                <View style={styles.noneIcon}><Ionicons name="person-outline" size={18} color={colors.brandPrimary} /></View>
                <Text style={[s.name, { flex: 1 }]}>{noneLabel}</Text>
              </Pressable>
            ) : null}
            {list.map((p) => (
              <Pressable key={p.id} onPress={() => { onChange(p); setOpen(false); setQ(""); }} style={[styles.row, value === p.id && styles.rowSel]} testID={`${testID}-${p.id}`}>
                <Avatar name={p.name} size={36} tone="gold" />
                <View style={{ flex: 1 }}>
                  <Text style={s.name} numberOfLines={1}>{p.name}</Text>
                  <Text style={s.meta} numberOfLines={1}>{[p.company, p.mobile].filter(Boolean).join(" · ")}</Text>
                </View>
                <Badge label={partnerShort(p.partner_type)} tone="gold" small />
              </Pressable>
            ))}
            {partners.isLoading ? <Text style={s.caption}>Loading partners…</Text> : !list.length ? <Text style={[s.caption, { padding: 8 }]}>No {type ? type.toLowerCase() : "partner"} matches. Partners appear here once registered.</Text> : null}
          </View>
        </View>
      )}
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

// "Registered number or another WhatsApp number" — step shared by greetings and document sharing.
export function WhatsAppNumber({ partner, value, onChange, label = "Send to WhatsApp number", testID = "wa-number" }: {
  label?: string; partner?: Partner | null; value: { mode: "registered" | "other"; other: string }; onChange: (v: { mode: "registered" | "other"; other: string }) => void; testID?: string }) {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const opt = (mode: "registered" | "other", title: string, sub: string) => {
    const sel = value.mode === mode;
    return (
      <Pressable onPress={() => onChange({ ...value, mode })} style={[styles.row, sel && styles.rowSel]} testID={`${testID}-${mode}`}>
        <Ionicons name={sel ? "radio-button-on" : "radio-button-off"} size={20} color={sel ? colors.brandPrimary : colors.muted} />
        <View style={{ flex: 1 }}>
          <Text style={s.name}>{title}</Text>
          <Text style={s.meta}>{sub}</Text>
        </View>
      </Pressable>
    );
  };
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      {opt("registered", "Registered mobile number", partner?.mobile || "Select a user first")}
      {opt("other", "Another WhatsApp number", "Use when the registered number is not on WhatsApp")}
      {value.mode === "other" ? (
        <Field placeholder="10-digit WhatsApp number" keyboardType="phone-pad" value={value.other} onChangeText={(other) => onChange({ ...value, other })} icon="logo-whatsapp" maxLength={14} containerStyle={{ marginTop: spacing.sm, marginBottom: 0 }} testID={`${testID}-other-input`} />
      ) : null}
    </View>
  );
}

export const resolveWaNumber = (partner: Partner | null | undefined, v: { mode: "registered" | "other"; other: string }) => (v.mode === "registered" ? partner?.mobile ?? "" : v.other);

// Opens WhatsApp with the message (wa.me) and records the send.
// Sending straight from the WhatsApp Business account needs the WhatsApp
// Business API on the backend; until then the message opens in WhatsApp.
export async function sendOnWhatsApp(entry: { kind: "greeting" | "document"; to_id?: string; to_name: string; to_number: string; message: string; occasion?: string; document?: string }) {
  const n = waNumber(entry.to_number);
  if (digits(n).length < 11) throw new Error("Enter a valid WhatsApp number");
  await post("/whatsapp/log", { ...entry, to_number: `+${n}` });
  await Linking.openURL(`https://wa.me/${n}?text=${encodeURIComponent(entry.message)}`);
}

const useStyles = makeStyles((colors) => ({
  label: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.4, color: colors.onSurfaceTertiary, marginBottom: 8 },
  box: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10, backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: "transparent", marginBottom: 4 },
  rowSel: { backgroundColor: colors.forestSoft, borderColor: colors.brandPrimary },
  noneIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  err: { fontFamily: fonts.body, fontSize: 12, color: colors.error, marginTop: 6 },
}));
