import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { get, post } from "@/src/api";
import { MODULES, Role } from "@/src/access";
import { useCan } from "@/src/auth";
import { Badge, BottomNav, BottomSheet, Button, EmptyState, ErrorState, Field, Header, Loading, useScreenStyles } from "@/src/components/ui";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

type RoleRow = Role & { staff_count: number };

// Admin · Role Management — list of roles; tap a role to edit its permissions.
export default function Roles() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const can = useCan();
  const roles = useQuery({ queryKey: ["roles"], queryFn: () => get<RoleRow[]>("/roles"), enabled: can("roles", "view") });
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation({
    mutationFn: () => post<Role>("/roles", { name, description }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      setAdding(false);
      toast.show("Role created — now choose its permissions", "success");
      router.push({ pathname: "/admin/roles/[id]", params: { id: r.id } });
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const granted = (r: Role) => MODULES.reduce((n, m) => n + (r.permissions[m.key]?.length ?? 0), 0);
  const total = MODULES.reduce((n, m) => n + m.actions.length, 0);

  return (
    <View style={s.screen} testID="roles-screen">
      <Header title="Role Management" right={can("roles", "add") ? <Pressable onPress={() => { setName(""); setDescription(""); setAdding(true); }} style={styles.addBtn} testID="roles-add-button"><Ionicons name="add" size={22} color={colors.onBrandSecondary} /></Pressable> : undefined} />
      {roles.isLoading ? <Loading /> : roles.isError ? <ErrorState message={(roles.error as Error).message} onRetry={roles.refetch} /> : (
        <FlatList
          data={roles.data ?? []}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 32, gap: 10 }}
          refreshControl={<RefreshControl refreshing={roles.isRefetching} onRefresh={roles.refetch} tintColor={colors.brandPrimary} />}
          ListHeaderComponent={
            <View style={{ marginBottom: spacing.sm }}>
              <Text style={[s.h2, { fontSize: 30 }]}>Roles</Text>
              <Text style={s.bodyMuted}>Permissions apply to both the Admin Panel and the mobile app. Partner logins stay view-only for leads and project visits.</Text>
            </View>
          }
          ListEmptyComponent={<EmptyState icon="shield-outline" title="No roles" />}
          renderItem={({ item: r }) => (
            <Pressable onPress={() => router.push({ pathname: "/admin/roles/[id]", params: { id: r.id } })} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]} testID={`role-card-${r.id}`}>
              <View style={styles.icon}><Ionicons name={r.kind === "partner" ? "people-outline" : r.system ? "key-outline" : "shield-checkmark-outline"} size={20} color={colors.brandPrimary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{r.name}</Text>
                <Text style={s.meta} numberOfLines={2}>{r.description}</Text>
                <View style={[s.row, { gap: 6, marginTop: 6, flexWrap: "wrap" }]}>
                  <Badge label={r.kind === "partner" ? "Partner login" : `${r.staff_count} staff`} tone={r.kind === "partner" ? "gold" : "brand"} small />
                  <Badge label={`${granted(r)} / ${total} permissions`} tone="muted" small />
                  {r.system ? <Badge label="System" tone="info" small /> : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          )}
        />
      )}
      <BottomSheet visible={adding} onClose={() => setAdding(false)} title="New role" testID="role-add-sheet">
        <Field label="Role name" placeholder="e.g. Site Manager" value={name} onChangeText={setName} testID="role-name-input" />
        <Field label="Description" placeholder="What this role is for" value={description} onChangeText={setDescription} multiline testID="role-description-input" />
        <Button label="Create role" icon="checkmark" variant="gold" onPress={() => create.mutate()} loading={create.isPending} testID="role-create-button" />
      </BottomSheet>
      <BottomNav active="profile" />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.forestSoft, alignItems: "center", justifyContent: "center" },
}));
