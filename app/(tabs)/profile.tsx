import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get } from "@/src/api";
import { useAuth } from "@/src/auth";
import { IMAGES } from "@/src/brand";
import { Avatar, Badge, Button, Card, InfoRow, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { fmtDate } from "@/src/format";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

// Screen 25 · Profile
export default function Profile() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, signOut } = useAuth();
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => get("/dashboard") });
  const [confirm, setConfirm] = useState(false);
  const name = `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Channel Partner";

  const MENU = [
    { label: "Edit profile", icon: "create-outline", route: "/(auth)/profile-type", testID: "menu-edit-profile" },
    { label: "Company & documents", icon: "document-text-outline", route: "/(auth)/profile-company", testID: "menu-documents" },
    { label: "MIS Report", icon: "stats-chart-outline", route: "/mis", testID: "menu-mis" },
    { label: "Notifications", icon: "notifications-outline", route: "/notifications", testID: "menu-notifications" },
    { label: "About County Green", icon: "leaf-outline", route: "/about", testID: "menu-about" },
    { label: "Terms & Conditions", icon: "shield-checkmark-outline", route: "/terms", testID: "menu-terms" },
  ] as const;

  return (
    <View style={s.screen} testID="profile-screen">
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={IMAGES["hero-fountain"]} style={styles.fill} contentFit="cover" />
          <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.fill} />
          <View style={[styles.heroTop, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.heroLabel}>MY PROFILE</Text>
            <Pressable onPress={() => router.push("/notifications")} hitSlop={8} testID="profile-notifications-button"><Ionicons name="notifications-outline" size={22} color={colors.onImage} /></Pressable>
          </View>
          <View style={styles.heroBody}>
            <Avatar name={name} size={64} tone="gold" />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} testID="profile-name">{name}</Text>
              <Text style={styles.sub}>{user?.partner_type ?? "Channel Partner"} · Partner ID CG-{(user?.id ?? "").slice(-6).toUpperCase()}</Text>
              <View style={{ marginTop: 6 }}><Badge label={user?.profile_completed ? "Verified" : "Pending"} small /></View>
            </View>
          </View>
        </View>

        <View style={s.content}>
          <View style={{ flexDirection: "row", gap: 10, marginTop: -24 }}>
            {[{ v: dash.data?.leads, l: "Leads", r: "/(tabs)/leads" }, { v: dash.data?.visits, l: "Visits", r: "/(tabs)/visits" }, { v: dash.data?.registrations, l: "Registrations", r: "/registrations" }].map((x) => (
              <Pressable key={x.l} onPress={() => router.push(x.r as any)} style={styles.stat} testID={`profile-stat-${x.l.toLowerCase()}`}>
                <Text style={styles.statValue}>{x.v ?? "—"}</Text>
                <Text style={styles.statLabel}>{x.l.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>

          <View style={[s.between, { marginTop: spacing.xl }]}>
            <SectionLabel style={{ marginBottom: 0, marginTop: 0 }}>Personal Information</SectionLabel>
            <Pressable onPress={() => router.push("/(auth)/profile-type")} style={s.row} testID="profile-edit-button"><Ionicons name="pencil-outline" size={13} color={colors.brandPrimary} /><Text style={[s.link, { marginLeft: 4 }]}>Edit</Text></Pressable>
          </View>
          <Card style={{ marginTop: spacing.md }}>
            <InfoRow icon="call-outline" label="Mobile number" value={user?.phone} />
            <InfoRow icon="mail-outline" label="Email address" value={user?.email} />
            <InfoRow icon="location-outline" label="City" value={user?.city} />
            <InfoRow icon="calendar-outline" label="Member since" value={fmtDate(user?.created_at)} />
          </Card>

          <SectionLabel style={{ marginTop: spacing.xl }}>Company Information</SectionLabel>
          <Card>
            <InfoRow icon="business-outline" label="Company / Firm" value={user?.company_name} />
            <InfoRow icon="ribbon-outline" label="RERA number" value={user?.rera_number} />
            <InfoRow icon="briefcase-outline" label="Experience" value={user?.experience} />
            <InfoRow icon="star-outline" label="Specialisation" value={user?.specialisation} />
            <InfoRow icon="people-outline" label="Associated employee" value={user?.associated_employee || "None"} />
          </Card>

          <SectionLabel style={{ marginTop: spacing.xl }}>Documents</SectionLabel>
          <Card>
            {(user?.documents ?? []).length ? (user?.documents ?? []).map((d) => (
              <View key={d.type} style={[s.between, { paddingVertical: 8 }]}>
                <Text style={[s.body, { fontSize: 14, flex: 1 }]}>{d.type}</Text>
                <Badge label={d.status} tone="warning" small />
              </View>
            )) : <Text style={s.bodyMuted}>No documents uploaded yet.</Text>}
          </Card>

          <SectionLabel style={{ marginTop: spacing.xl }}>Settings & More</SectionLabel>
          <Card style={{ padding: 4 }}>
            {MENU.map((m, i) => (
              <Pressable key={m.label} onPress={() => router.push(m.route as any)} style={[styles.menu, i < MENU.length - 1 && styles.menuBorder]} testID={m.testID}>
                <Ionicons name={m.icon} size={18} color={colors.brandPrimary} />
                <Text style={styles.menuText}>{m.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </Pressable>
            ))}
          </Card>

          <Button label="Log out" variant="danger" icon="log-out-outline" onPress={() => setConfirm(true)} style={{ marginTop: spacing.xl }} testID="logout-button" />
          <Text style={[s.caption, { textAlign: "center", marginTop: spacing.lg }]}>County Green Partner App · v1.0.0</Text>
        </View>
      </ScrollView>

      <Modal visible={confirm} transparent animationType="fade" onRequestClose={() => setConfirm(false)}>
        <Pressable style={styles.backdrop} onPress={() => setConfirm(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}} testID="logout-sheet">
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Log out of County Green?</Text>
            <Text style={[s.bodyMuted, { marginBottom: spacing.lg }]}>You{"'"}ll need to verify your mobile number again to sign back in.</Text>
            <Button label="Log out" variant="danger" onPress={async () => { setConfirm(false); await signOut(); toast.show("You have been logged out", "info"); router.replace("/(auth)/login"); }} testID="confirm-logout-button" />
            <Button label="Cancel" variant="ghost" small onPress={() => setConfirm(false)} style={{ marginTop: 8 }} testID="cancel-logout-button" />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  hero: { height: 250, backgroundColor: colors.forestDeep },
  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.lg },
  heroLabel: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 2, color: colors.brandSecondary },
  heroBody: { flex: 1, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: spacing.lg, paddingBottom: 40 },
  name: { fontFamily: fonts.display, fontSize: 28, color: colors.onImage },
  sub: { fontFamily: fonts.body, fontSize: 12, color: colors.onImageMuted, marginTop: 2 },
  stat: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 12, alignItems: "center" },
  statValue: { fontFamily: fonts.display, fontSize: 26, color: colors.brandPrimary },
  statLabel: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1, color: colors.muted, marginTop: 2 },
  menu: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, paddingHorizontal: 12, minHeight: 48 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  menuText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.onSurface },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  sheetTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.onSurface, marginBottom: 4 },
}));
