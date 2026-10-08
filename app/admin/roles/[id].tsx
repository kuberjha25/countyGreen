import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { del, get, patch } from "@/src/api";
import { Action, ACTIONS, isLocked, MODULES, ModuleKey, Permissions, Role } from "@/src/access";
import { useAuth, useCan } from "@/src/auth";
import { Badge, Button, ConfirmSheet, ErrorState, Field, Header, Loading, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

// Admin · Role permissions matrix (module × View / Add / Edit / Modify / Delete / Assign / Reassign / Share).
export default function RoleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const can = useCan();
  const { refresh } = useAuth();
  const role = useQuery({ queryKey: ["role", id], queryFn: () => get<Role & { staff_count: number }>(`/roles/${id}`) });
  const r = role.data;
  // Unsaved edits; until the first change the saved role is shown.
  const [draft, setDraft] = useState<Permissions | null>(null);
  const [nameDraft, setName] = useState<string | null>(null);
  const [descDraft, setDescription] = useState<string | null>(null);
  const perms = draft ?? r?.permissions ?? {};
  const name = nameDraft ?? r?.name ?? "";
  const description = descDraft ?? r?.description ?? "";
  const setPerms = (fn: (p: Permissions) => Permissions) => setDraft(fn(perms));
  const [deleting, setDeleting] = useState(false);
  const editable = can("roles", "edit") && !!r && !(r.system && r.kind === "staff");

  const toggle = (m: ModuleKey, a: Action) =>
    setPerms((p) => {
      const cur = p[m] ?? [];
      let next = cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a];
      if (a !== "view" && next.includes(a) && !next.includes("view")) next = ["view", ...next]; // anything implies view
      if (a === "view" && !next.includes("view")) next = []; // no view → nothing
      return { ...p, [m]: next };
    });
  const setAll = (m: ModuleKey, on: boolean) => setPerms((p: Permissions) => ({ ...p, [m]: on ? MODULES.find((x) => x.key === m)!.actions.filter((a) => !isLocked(r!, m, a)) : [] }));

  const save = useMutation({
    mutationFn: () => patch(`/roles/${id}`, { name, description, permissions: perms }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      qc.invalidateQueries({ queryKey: ["role", id] });
      refresh();
      toast.show("Permissions saved", "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });
  const remove = useMutation({
    mutationFn: () => del(`/roles/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      toast.show("Role deleted", "success");
      router.back();
    },
    onError: (e: Error) => {
      setDeleting(false);
      toast.show(e.message, "error");
    },
  });

  return (
    <View style={s.screen} testID="role-detail-screen">
      <Header title="Role Permissions" showBell={false} />
      {role.isLoading ? <Loading /> : role.isError || !r ? <ErrorState message={(role.error as Error)?.message ?? "Not found"} onRetry={role.refetch} /> : (
        <>
          <ScrollView contentContainerStyle={[s.content, { paddingTop: 8, paddingBottom: 24 }]} showsVerticalScrollIndicator={false}>
            <View style={[s.row, { gap: 6, marginBottom: spacing.md, flexWrap: "wrap" }]}>
              <Badge label={r.kind === "partner" ? "Partner login (CP / Broker / Influencer / Freelancer)" : `${r.staff_count} staff on this role`} tone={r.kind === "partner" ? "gold" : "brand"} small />
              {r.system ? <Badge label="System role" tone="info" small /> : null}
            </View>
            {editable && !r.system ? (
              <>
                <Field label="Role name" value={name} onChangeText={setName} testID="role-name-edit" />
                <Field label="Description" value={description} onChangeText={setDescription} multiline testID="role-description-edit" />
              </>
            ) : (
              <>
                <Text style={[s.h2, { fontSize: 28 }]}>{r.name}</Text>
                <Text style={[s.bodyMuted, { marginBottom: spacing.md }]}>{r.description}</Text>
              </>
            )}
            {r.system && r.kind === "staff" ? <Text style={[s.caption, { marginBottom: spacing.md }]}>The Admin role always has full access and cannot be changed.</Text> : null}
            {r.kind === "partner" ? <Text style={[s.caption, { marginBottom: spacing.md }]}>Locked cells cannot be granted: partners never add, edit, modify or delete leads and project visits — County Green staff do it for them.</Text> : null}

            <SectionLabel>Permissions</SectionLabel>
            <View style={{ gap: 10 }}>
              {MODULES.map((m) => {
                const cur = perms[m.key] ?? [];
                const grantable = m.actions.filter((a) => !isLocked(r, m.key, a));
                const allOn = grantable.length > 0 && grantable.every((a) => cur.includes(a));
                return (
                  <View key={m.key} style={styles.module} testID={`perm-module-${m.key}`}>
                    <View style={s.between}>
                      <Text style={[s.name, { flex: 1 }]}>{m.label}</Text>
                      {editable && grantable.length ? (
                        <Pressable onPress={() => setAll(m.key, !allOn)} hitSlop={8} testID={`perm-all-${m.key}`}><Text style={s.link}>{allOn ? "Clear" : "All"}</Text></Pressable>
                      ) : null}
                    </View>
                    {"hint" in m && m.hint ? <Text style={[s.caption, { marginTop: 2 }]}>{m.hint}</Text> : null}
                    <View style={styles.chips}>
                      {m.actions.map((a) => {
                        const locked = r.kind === "partner" ? isLocked(r, m.key, a) : r.system;
                        const on = r.system && r.kind === "staff" ? true : cur.includes(a);
                        return (
                          <Pressable key={a} disabled={!editable || locked} onPress={() => toggle(m.key, a)} style={[styles.chip, on && styles.chipOn, locked && !on && styles.chipLocked]} testID={`perm-${m.key}-${a}`}>
                            <Ionicons name={locked && !on ? "lock-closed" : on ? "checkmark" : "add"} size={12} color={on ? colors.onBrandPrimary : colors.muted} />
                            <Text style={[styles.chipText, on && { color: colors.onBrandPrimary }]}>{ACTIONS[a]}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
            {can("roles", "delete") && !r.system ? <Button label="Delete role" icon="trash-outline" variant="danger" small onPress={() => setDeleting(true)} style={{ marginTop: spacing.xl }} testID="role-delete-button" /> : null}
          </ScrollView>
          {editable ? (
            <View style={styles.footer}>
              <Button label="Save permissions" icon="checkmark" variant="gold" onPress={() => save.mutate()} loading={save.isPending} testID="role-save-button" />
            </View>
          ) : null}
          <ConfirmSheet visible={deleting} onClose={() => setDeleting(false)} title="Delete role?" body={r.staff_count ? `Move the ${r.staff_count} staff on "${r.name}" to another role first.` : `"${r.name}" will be removed.`} confirmLabel="Delete role" danger onConfirm={() => remove.mutate()} loading={remove.isPending} testID="role-delete" />
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  module: { padding: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 32, paddingHorizontal: 10, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipLocked: { opacity: 0.45 },
  chipText: { fontFamily: fonts.medium, fontSize: 12, color: colors.onSurfaceTertiary },
  footer: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
}));
