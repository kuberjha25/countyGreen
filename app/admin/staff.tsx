import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { User, get, patch, post } from "@/src/api";
import { Role } from "@/src/access";
import { useAuth, useCan } from "@/src/auth";
import { Avatar, Badge, BottomNav, BottomSheet, Button, ChoiceChips, EmptyState, ErrorState, Field, Header, Loading, SearchBar, useScreenStyles } from "@/src/components/ui";
import { radius, spacing, makeStyles, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

const EMPTY = { first_name: "", last_name: "", mobile: "", role_id: "" };

// Admin · Staff — County Green staff logins and the role each one has (drives their app permissions).
export default function Staff() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const can = useCan();
  const { user } = useAuth();
  const staff = useQuery({ queryKey: ["staff"], queryFn: () => get<User[]>("/staff") });
  const roles = useQuery({ queryKey: ["roles"], queryFn: () => get<Role[]>("/roles") });
  const staffRoles = (roles.data ?? []).filter((r) => r.kind === "staff");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState(EMPTY);
  const name = (u: User) => `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  const list = (staff.data ?? []).filter((u) => !q || `${name(u)} ${u.phone} ${u.role_name}`.toLowerCase().includes(q.toLowerCase()));
  const roleName = (id?: string) => staffRoles.find((r) => r.id === id)?.name;
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["staff"] });
    qc.invalidateQueries({ queryKey: ["employees"] });
    qc.invalidateQueries({ queryKey: ["roles"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const update = useMutation({
    mutationFn: (body: Partial<User>) => patch<User>(`/staff/${editing?.id}`, body),
    onSuccess: (u) => {
      invalidate();
      setEditing(u);
      toast.show("Staff updated", "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });
  const create = useMutation({
    mutationFn: () => post<User>("/staff", f),
    onSuccess: (u) => {
      invalidate();
      setAdding(false);
      toast.show(`${name(u)} can now log in with ${u.phone}`, "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  return (
    <View style={s.screen} testID="staff-screen">
      <Header title="Staff" right={can("roles", "add") ? <Pressable onPress={() => { setF({ ...EMPTY, role_id: staffRoles.find((r) => r.id !== "role-admin")?.id ?? "" }); setAdding(true); }} style={styles.addBtn} testID="staff-add-button"><Ionicons name="add" size={22} color={colors.onBrandSecondary} /></Pressable> : undefined} />
      <View style={s.content}>
        <Text style={[s.h2, { fontSize: 30 }]}>Staff</Text>
        <Text style={[s.bodyMuted, { marginBottom: spacing.md }]}>Each staff member logs in with their mobile number; what they can do comes from their role.</Text>
        <SearchBar value={q} onChange={setQ} placeholder="Search name, mobile or role" testID="staff-search" />
      </View>
      {staff.isLoading ? <Loading /> : staff.isError ? <ErrorState message={(staff.error as Error).message} onRetry={staff.refetch} /> : (
        <FlatList
          data={list}
          keyExtractor={(u) => u.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 32, gap: 10 }}
          refreshControl={<RefreshControl refreshing={staff.isRefetching} onRefresh={staff.refetch} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={<EmptyState icon="people-outline" title="No staff found" />}
          renderItem={({ item: u }) => (
            <Pressable onPress={() => setEditing(u)} style={({ pressed }) => [styles.card, u.active === false && { opacity: 0.55 }, pressed && { opacity: 0.9 }]} testID={`staff-card-${u.id}`}>
              <Avatar name={name(u)} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{name(u)}{u.id === user?.id ? " (you)" : ""}</Text>
                <Text style={s.meta}>{u.phone}</Text>
                <View style={[s.row, { gap: 6, marginTop: 6 }]}>
                  <Badge label={u.role_name ?? "—"} small />
                  {u.active === false ? <Badge label="Inactive" small /> : null}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          )}
        />
      )}

      <BottomSheet visible={!!editing} onClose={() => setEditing(null)} title={editing ? name(editing) : ""} subtitle={editing?.phone} testID="staff-edit-sheet">
        {editing ? (
          <>
            {can("roles", "assign") && editing.id !== user?.id ? (
              <ChoiceChips label="Role" value={roleName(editing.role_id)} options={staffRoles.map((r) => r.name)} onChange={(n) => update.mutate({ role_id: staffRoles.find((r) => r.name === n)?.id })} testID="staff-role" />
            ) : (
              <Text style={[s.body, { marginBottom: spacing.lg }]}>Role: {editing.role_name}</Text>
            )}
            <Text style={[s.caption, { marginTop: spacing.md }]}>Role changes apply the next time the staff member opens the app.</Text>
          </>
        ) : null}
      </BottomSheet>

      <BottomSheet visible={adding} onClose={() => setAdding(false)} title="Add staff" testID="staff-add-sheet">
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Field label="First name" value={f.first_name} onChangeText={(v) => setF((x) => ({ ...x, first_name: v }))} containerStyle={{ flex: 1 }} testID="staff-first-name" />
          <Field label="Last name" value={f.last_name} onChangeText={(v) => setF((x) => ({ ...x, last_name: v }))} containerStyle={{ flex: 1 }} testID="staff-last-name" />
        </View>
        <Field label="Mobile number (login)" placeholder="10-digit mobile" value={f.mobile} onChangeText={(v) => setF((x) => ({ ...x, mobile: v }))} keyboardType="phone-pad" icon="call-outline" testID="staff-mobile" />
        <ChoiceChips label="Role" value={roleName(f.role_id)} options={staffRoles.map((r) => r.name)} onChange={(n) => setF((x) => ({ ...x, role_id: staffRoles.find((r) => r.name === n)?.id ?? "" }))} testID="staff-new-role" />
        <Button label="Add staff" icon="checkmark" variant="gold" onPress={() => create.mutate()} loading={create.isPending} testID="staff-create-button" />
      </BottomSheet>
      <BottomNav active="profile" />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
}));
