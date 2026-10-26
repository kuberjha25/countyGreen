import Ionicons from "@react-native-vector-icons/ionicons";
import React, { useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";

import { errorMessage } from "@/src/api";
import { Avatar, Field, SearchBar, useScreenStyles } from "@/src/components/ui";
import { digits, waNumber } from "@/src/format";
import { useAppDispatch } from "@/src/store";
import { searchReferences } from "@/src/store/lookupsSlice";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import type { Reference } from "@/src/types";

// Inline (no modal) picker over GET /api/leads/references — partners and staff, searched on the server.
export function ReferenceChooser({
  value,
  onChange,
  userType,
  noneLabel,
  label = "Select user",
  error,
  testID = "reference-chooser",
}: {
  value?: Reference | null;
  onChange: (r: Reference | null) => void;
  userType?: "backoffice"; // staff only
  noneLabel?: string; // when set, a "nobody" choice is offered
  label?: string;
  error?: string;
  testID?: string;
}) {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const dispatch = useAppDispatch();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(!value);
  const [items, setItems] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<string | undefined>();

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await dispatch(searchReferences({ search: q || undefined, userType })).unwrap();
        if (alive) {
          setItems(r.data ?? []);
          setFailed(undefined);
        }
      } catch (e) {
        if (alive) setFailed(errorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, open, userType, dispatch]);

  return (
    <View style={{ marginBottom: spacing.lg }} testID={testID}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      {!open && (value || noneLabel) ? (
        <View style={[styles.row, styles.rowSel]}>
          {value ? <Avatar name={value.name} size={36} tone="gold" /> : <View style={styles.noneIcon}><Ionicons name="person-outline" size={18} color={colors.brandPrimary} /></View>}
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{value ? value.name : noneLabel}</Text>
            {value ? <Text style={s.meta}>{value.display_text ?? value.mobile}</Text> : null}
          </View>
          <Pressable onPress={() => setOpen(true)} hitSlop={8} testID={`${testID}-change`}><Text style={s.link}>Change</Text></Pressable>
        </View>
      ) : (
        <View style={[styles.box, !!error && { borderColor: colors.error }]}>
          <SearchBar value={q} onChange={setQ} placeholder="Search by name or mobile" testID={`${testID}-search`} />
          <View style={{ marginTop: spacing.sm }}>
            {noneLabel ? (
              <Pressable onPress={() => { onChange(null); setOpen(false); }} style={[styles.row, !value && styles.rowSel]} testID={`${testID}-none`}>
                <View style={styles.noneIcon}><Ionicons name="person-outline" size={18} color={colors.brandPrimary} /></View>
                <Text style={[s.name, { flex: 1 }]}>{noneLabel}</Text>
              </Pressable>
            ) : null}
            {items.map((r) => (
              <Pressable key={r.id} onPress={() => { onChange(r); setOpen(false); setQ(""); }} style={[styles.row, value?.id === r.id && styles.rowSel]} testID={`${testID}-${r.id}`}>
                <Avatar name={r.name} size={36} tone="gold" />
                <View style={{ flex: 1 }}>
                  <Text style={s.name} numberOfLines={1}>{r.name}</Text>
                  <Text style={s.meta} numberOfLines={1}>{r.display_text ?? r.mobile}</Text>
                </View>
              </Pressable>
            ))}
            {loading ? <Text style={[s.caption, { padding: 8 }]}>Searching…</Text> : failed ? <Text style={[styles.err, { padding: 8 }]}>{failed}</Text> : !items.length ? <Text style={[s.caption, { padding: 8 }]}>No matches.</Text> : null}
          </View>
        </View>
      )}
      {error ? <Text style={styles.err}>{error}</Text> : null}
    </View>
  );
}

// "Registered number or another WhatsApp number" — used by document sharing.
export function WhatsAppNumber({ registered, value, onChange, label = "Send to WhatsApp number", testID = "wa-number" }: { registered?: string; value: { mode: "registered" | "other"; other: string }; onChange: (v: { mode: "registered" | "other"; other: string }) => void; label?: string; testID?: string }) {
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
      {opt("registered", "Registered mobile number", registered || "Select a user first")}
      {opt("other", "Another WhatsApp number", "Use when the registered number is not on WhatsApp")}
      {value.mode === "other" ? (
        <Field placeholder="10-digit WhatsApp number" keyboardType="phone-pad" value={value.other} onChangeText={(other) => onChange({ ...value, other })} icon="logo-whatsapp" maxLength={14} containerStyle={{ marginTop: spacing.sm, marginBottom: 0 }} testID={`${testID}-other-input`} />
      ) : null}
    </View>
  );
}

// Opens WhatsApp with the message ready to send (wa.me).
export async function openWhatsApp(number: string, message: string) {
  const n = waNumber(number);
  if (n.includes("*") || digits(n).length < 11) throw new Error("Enter a valid WhatsApp number");
  await Linking.openURL(`https://wa.me/${n}?text=${encodeURIComponent(message)}`);
}

const useStyles = makeStyles((colors) => ({
  label: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.4, color: colors.onSurfaceTertiary, marginBottom: 8 },
  box: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 10, backgroundColor: colors.surface },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: radius.md, borderWidth: 1, borderColor: "transparent", marginBottom: 4 },
  rowSel: { backgroundColor: colors.forestSoft, borderColor: colors.brandPrimary },
  noneIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  err: { fontFamily: fonts.body, fontSize: 12, color: colors.error, marginTop: 6 },
}));
