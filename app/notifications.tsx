import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get, post } from "@/src/api";
import { BottomNav, ChipRow, EmptyState, ErrorState, Header, Loading, useScreenStyles } from "@/src/components/ui";
import { relTime } from "@/src/format";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

const CATS = ["All", "Registration Updates", "Lead Updates", "Project Updates", "Announcements", "System"];
const ICON: Record<string, any> = { "Registration Updates": "person-add-outline", "Lead Updates": "people-outline", "Project Updates": "home-outline", Announcements: "megaphone-outline", System: "settings-outline" };

// Screen 26 · Notifications
export default function Notifications() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [cat, setCat] = useState("All");
  const notes = useQuery({ queryKey: ["notifications"], queryFn: () => get<any[]>("/notifications") });
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const readOne = useMutation({ mutationFn: (id: string) => post(`/notifications/${id}/read`), onSuccess: invalidate });
  const readAll = useMutation({ mutationFn: () => post("/notifications/read-all"), onSuccess: invalidate });
  const list = (notes.data ?? []).filter((n) => cat === "All" || n.category === cat);
  const groups = [
    { title: "Today", items: list.filter((n) => Date.now() - new Date(n.created_at).getTime() < 86400000) },
    { title: "Yesterday", items: list.filter((n) => { const d = Date.now() - new Date(n.created_at).getTime(); return d >= 86400000 && d < 2 * 86400000; }) },
    { title: "Earlier", items: list.filter((n) => Date.now() - new Date(n.created_at).getTime() >= 2 * 86400000) },
  ].filter((g) => g.items.length);
  const unread = (notes.data ?? []).filter((n) => !n.read).length;

  return (
    <View style={s.screen} testID="notifications-screen">
      <Header title="Notifications" showBell={false} right={unread ? <Pressable onPress={() => readAll.mutate()} hitSlop={8} testID="mark-all-read-button"><Text style={s.link}>Mark all read</Text></Pressable> : null} />
      <View style={[s.content, { paddingBottom: 4 }]}>
        <Text style={[s.h2, { fontSize: 30 }]}>Notifications</Text>
        <Text style={s.bodyMuted}>{unread ? `${unread} unread` : "You're all caught up"}</Text>
      </View>
      <ChipRow options={CATS} value={cat} onChange={setCat} testIDPrefix="notif-cat" />
      {notes.isLoading ? <Loading /> : notes.isError ? <ErrorState message={(notes.error as Error).message} onRetry={notes.refetch} /> : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 24 }} refreshControl={<RefreshControl refreshing={notes.isRefetching} onRefresh={notes.refetch} tintColor={colors.brandPrimary} />}>
          {groups.length === 0 ? <EmptyState icon="notifications-off-outline" title="No notifications" body="Updates about registrations, leads and the project will appear here." /> : null}
          {groups.map((g) => (
            <View key={g.title} style={{ marginBottom: spacing.lg }}>
              <Text style={styles.group}>{g.title.toUpperCase()}</Text>
              <View style={{ gap: 8 }}>
                {g.items.map((n) => (
                  <Pressable key={n.id} onPress={() => !n.read && readOne.mutate(n.id)} style={({ pressed }) => [styles.row, !n.read && styles.unread, pressed && { opacity: 0.9 }]} testID={`notification-${n.id}`}>
                    <View style={[styles.icon, !n.read && { backgroundColor: colors.brandPrimary }]}>
                      <Ionicons name={ICON[n.category] ?? "notifications-outline"} size={18} color={!n.read ? colors.onBrandPrimary : colors.brandPrimary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={s.between}>
                        <Text style={[s.name, n.read && { fontFamily: fonts.medium }]} numberOfLines={1}>{n.title}</Text>
                        <Text style={s.caption}>{relTime(n.created_at)}</Text>
                      </View>
                      <Text style={[s.bodyMuted, { marginTop: 2 }]} numberOfLines={2}>{n.body}</Text>
                      <Text style={styles.cat}>{n.category.toUpperCase()}</Text>
                    </View>
                    {!n.read ? <View style={styles.dot} testID={`unread-dot-${n.id}`} /> : null}
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      <BottomNav />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  group: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.8, color: colors.onSurfaceTertiary, marginBottom: 10, marginTop: 4 },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  unread: { borderColor: colors.brandSecondary, backgroundColor: colors.goldSoft },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.forestSoft, alignItems: "center", justifyContent: "center" },
  cat: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1, color: colors.brandSecondary, marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandSecondary, marginTop: 6 },
}));
