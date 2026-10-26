import Ionicons from "@react-native-vector-icons/ionicons";
import { useEffect, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomNav, ChipRow, EmptyState, ErrorState, Header, Loading, useScreenStyles } from "@/src/components/ui";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from "@/src/store/contentSlice";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import type { NotificationItem } from "@/src/types";

const ALL = "All";

// Screen 26 · Notifications (GET /api/notifications — latest 20; created_at is relative text like "2 hours ago").
export default function Notifications() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const notes = useAppSelector((st) => st.content.notifications);
  const [cat, setCat] = useState(ALL);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const all = notes.data ?? [];
  const cats = [ALL, ...new Set(all.map((n) => n.type).filter(Boolean))];
  const list = all.filter((n) => cat === ALL || n.type === cat);
  const unreadIds = all.filter((n) => !n.is_read).map((n) => n.id);

  const open = (n: NotificationItem) => {
    if (!n.is_read) dispatch(markNotificationRead(n.id));
    if (n.action_link) Linking.openURL(n.action_link);
  };

  return (
    <View style={s.screen} testID="notifications-screen">
      <Header title="Notifications" showBell={false} right={unreadIds.length ? <Pressable onPress={() => dispatch(markAllNotificationsRead(unreadIds))} hitSlop={8} testID="mark-all-read-button"><Text style={s.link}>Mark all read</Text></Pressable> : null} />
      <View style={[s.content, { paddingBottom: 4 }]}>
        <Text style={[s.h2, { fontSize: 30 }]}>Notifications</Text>
        <Text style={s.bodyMuted}>{unreadIds.length ? `${unreadIds.length} unread` : "You're all caught up"}</Text>
      </View>
      {cats.length > 2 ? <ChipRow options={cats} value={cat} onChange={setCat} testIDPrefix="notif-cat" /> : null}
      {notes.status === "loading" && !notes.data ? <Loading /> : notes.status === "failed" && !notes.data ? <ErrorState message={notes.error ?? "Could not load notifications"} onRetry={() => dispatch(fetchNotifications())} /> : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 24, gap: 8 }} refreshControl={<RefreshControl refreshing={notes.status === "loading"} onRefresh={() => dispatch(fetchNotifications())} tintColor={colors.brandPrimary} />}>
          {list.length === 0 ? <EmptyState icon="notifications-off-outline" title="No notifications" body="Updates about registrations, leads and the project will appear here." /> : null}
          {list.map((n) => (
            <Pressable key={n.id} onPress={() => open(n)} style={({ pressed }) => [styles.row, !n.is_read && styles.unread, pressed && { opacity: 0.9 }]} testID={`notification-${n.id}`}>
              <View style={[styles.icon, !n.is_read && { backgroundColor: colors.brandPrimary }]}>
                <Ionicons name="notifications-outline" size={18} color={!n.is_read ? colors.onBrandPrimary : colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.between}>
                  <Text style={[s.name, { flex: 1 }, n.is_read && { fontFamily: fonts.medium }]} numberOfLines={1}>{n.title}</Text>
                  <Text style={s.caption}>{n.created_at}</Text>
                </View>
                <Text style={[s.bodyMuted, { marginTop: 2 }]} numberOfLines={3}>{n.message}</Text>
                {n.type ? <Text style={styles.cat}>{n.type.toUpperCase()}</Text> : null}
              </View>
              {!n.is_read ? <View style={styles.dot} testID={`unread-dot-${n.id}`} /> : null}
            </Pressable>
          ))}
        </ScrollView>
      )}
      <BottomNav />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start", padding: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  unread: { borderColor: colors.brandSecondary, backgroundColor: colors.goldSoft },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.forestSoft, alignItems: "center", justifyContent: "center" },
  cat: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1, color: colors.brandSecondary, marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brandSecondary, marginTop: 6 },
}));
