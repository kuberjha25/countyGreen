import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { api } from "@/src/api";
import { useCan } from "@/src/auth";
import { MASTERS, MasterKey } from "@/src/brand";
import { BottomNav, BottomSheet, Button, ConfirmSheet, EmptyState, Field, Header, ScreenTitle, useScreenStyles } from "@/src/components/ui";
import { useLookups } from "@/src/lookups";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

// Admin · one master list — add, edit (rename), delete and reorder options.
export default function MasterList() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const can = useCan();
  const lookups = useLookups();
  const master = MASTERS.find((m) => m.key === key);
  const items = master ? lookups[master.key as MasterKey] : [];
  const [value, setValue] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [rename, setRename] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const call = useMutation({
    mutationFn: ({ method, body }: { method: string; body: object }) => api(`/masters/${key}`, { method, body: JSON.stringify(body) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lookups"] });
      setEditing(null);
      setDeleting(null);
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  if (!master) {
    return (
      <View style={s.screen}>
        <Header title="Masters" />
        <EmptyState icon="list-outline" title="Unknown master" />
      </View>
    );
  }

  const move = (i: number, d: -1 | 1) => {
    const next = [...items];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    call.mutate({ method: "PUT", body: { items: next } });
  };
  const add = () => {
    if (!value.trim()) return toast.show(`Enter the ${master.label.toLowerCase()}`, "error");
    call.mutate({ method: "POST", body: { value: value.trim() } }, { onSuccess: () => { setValue(""); toast.show("Added", "success"); } });
  };

  return (
    <View style={s.screen} testID={`master-list-${key}`}>
      <Header title={master.label} />
      <ScrollView contentContainerStyle={[s.content, { paddingTop: 8 }]} keyboardShouldPersistTaps="handled">
        <ScreenTitle title={master.label} subtitle="Shown in this order in the app. Existing leads keep the value they were saved with." />
        {can("masters", "add") ? (
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <Field placeholder={`New ${master.label.toLowerCase()}`} value={value} onChangeText={setValue} containerStyle={{ flex: 1 }} onSubmitEditing={add} returnKeyType="done" testID="master-new-input" />
            <Button label="Add" icon="add" small onPress={add} loading={call.isPending && !editing && !deleting} style={{ minHeight: 52 }} testID="master-add-button" />
          </View>
        ) : null}
        <View style={styles.list}>
          {items.map((it, i) => (
            <View key={it} style={[styles.row, i > 0 && styles.border]} testID={`master-item-${i}`}>
              <Text style={[s.body, { flex: 1, fontSize: 15 }]}>{it}</Text>
              {can("masters", "edit") ? (
                <>
                  <Pressable disabled={i === 0} onPress={() => move(i, -1)} hitSlop={6} style={{ opacity: i === 0 ? 0.3 : 1 }} testID={`master-up-${i}`}><Ionicons name="chevron-up" size={18} color={colors.muted} /></Pressable>
                  <Pressable disabled={i === items.length - 1} onPress={() => move(i, 1)} hitSlop={6} style={{ opacity: i === items.length - 1 ? 0.3 : 1 }} testID={`master-down-${i}`}><Ionicons name="chevron-down" size={18} color={colors.muted} /></Pressable>
                  <Pressable onPress={() => { setRename(it); setEditing(it); }} hitSlop={6} testID={`master-edit-${i}`}><Ionicons name="pencil-outline" size={17} color={colors.brandPrimary} /></Pressable>
                </>
              ) : null}
              {can("masters", "delete") ? <Pressable onPress={() => setDeleting(it)} hitSlop={6} testID={`master-delete-${i}`}><Ionicons name="trash-outline" size={17} color={colors.error} /></Pressable> : null}
            </View>
          ))}
        </View>
      </ScrollView>
      <BottomSheet visible={!!editing} onClose={() => setEditing(null)} title={`Edit ${master.label.toLowerCase()}`} testID="master-edit-sheet">
        <Field value={rename} onChangeText={setRename} testID="master-rename-input" />
        <Button label="Save" icon="checkmark" variant="gold" onPress={() => call.mutate({ method: "PATCH", body: { from: editing, to: rename } }, { onSuccess: () => toast.show("Saved", "success") })} loading={call.isPending} testID="master-rename-save" />
      </BottomSheet>
      <ConfirmSheet visible={!!deleting} onClose={() => setDeleting(null)} title={`Delete "${deleting ?? ""}"?`} body="It will no longer be offered in the app. Leads already saved with it are not changed." confirmLabel="Delete" danger onConfirm={() => call.mutate({ method: "DELETE", body: { value: deleting } })} loading={call.isPending} testID="master-delete" />
      <BottomNav active="profile" />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  list: { marginTop: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 52 },
  border: { borderTopWidth: 1, borderTopColor: colors.divider },
}));
