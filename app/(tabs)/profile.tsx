import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BASE_URL } from "@/src/api";
import { isStaff } from "@/src/access";
import { useAuth } from "@/src/auth";
import { IMAGES, imageSource, partnerTypeName } from "@/src/brand";
import { Avatar, Badge, Button, Card, InfoRow, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { fmtDate } from "@/src/format";
import { useAppSelector } from "@/src/store";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";
import { BUSINESS_TYPES, label } from "@/src/types";

// Screen 25 · Profile (GET /api/auth/profile)
export default function Profile() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { user, stats, signOut } = useAuth();
  const counts = useAppSelector((st) => st.dashboard.counts);
  const staff = isStaff(user);
  const [confirm, setConfirm] = useState(false);
  const pp = user?.partner_profile;
  const name = user?.name || "County Green";
  const roleName = staff ? user?.role?.name ?? "Staff" : partnerTypeName(pp?.partner_type);
  const photo = user?.profile_photo ? `${BASE_URL}/storage/${user.profile_photo}` : null;

  const MENU = [
    { label: "Admin & Settings", icon: "settings-outline", route: "/admin", testID: "menu-admin", show: staff },
    { label: "Edit profile", icon: "create-outline", route: "/profile-edit", testID: "menu-edit-profile" },
    { label: "Registrations", icon: "person-add-outline", route: "/registrations", testID: "menu-registrations", show: staff },
    { label: "Birthday & anniversary greetings", icon: "gift-outline", route: "/greetings", testID: "menu-greetings", show: staff },
    { label: "MIS Report", icon: "stats-chart-outline", route: "/mis", testID: "menu-mis" },
    { label: "Notifications", icon: "notifications-outline", route: "/notifications", testID: "menu-notifications" },
    { label: "About County Green", icon: "leaf-outline", route: "/about", testID: "menu-about" },
    { label: "Terms & Conditions", icon: "shield-checkmark-outline", route: "/terms", testID: "menu-terms" },
  ].filter((m) => m.show !== false);

  const tiles = [
    { v: stats?.enquiries ?? counts?.leads, l: "Enquiries", r: { pathname: "/(tabs)/leads", params: { status: "all" } } },
    { v: stats?.site_visits ?? counts?.visits, l: "Site visits", r: { pathname: "/(tabs)/visits", params: { status: "all" } } },
    { v: stats?.bookings, l: "Bookings", r: { pathname: "/(tabs)/leads", params: { status: "booked" } } },
  ];

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
            {photo ? <Image source={imageSource(photo)} style={styles.photo} contentFit="cover" /> : <Avatar name={name} size={64} tone="gold" />}
            <View style={{ flex: 1 }}>
              <Text style={styles.name} testID="profile-name">{name}</Text>
              <Text style={styles.sub}>{roleName} · ID CG-{String(user?.id ?? "").padStart(4, "0")}</Text>
              <View style={{ marginTop: 6 }}><Badge label={staff ? "County Green Staff" : pp?.status === "completed" ? "Verified" : "Pending approval"} small /></View>
            </View>
          </View>
        </View>

        <View style={s.content}>
          <View style={{ flexDirection: "row", gap: 10, marginTop: -24 }}>
            {tiles.map((x) => (
              <Pressable key={x.l} onPress={() => router.push(x.r as any)} style={styles.stat} testID={`profile-stat-${x.l.toLowerCase().replace(/\s+/g, "-")}`}>
                <Text style={styles.statValue}>{x.v ?? "—"}</Text>
                <Text style={styles.statLabel}>{x.l.toUpperCase()}</Text>
              </Pressable>
            ))}
          </View>

          <View style={[s.between, { marginTop: spacing.xl }]}>
            <SectionLabel style={{ marginBottom: 0, marginTop: 0 }}>Personal Information</SectionLabel>
            <Pressable onPress={() => router.push("/profile-edit" as any)} style={s.row} testID="profile-edit-button"><Ionicons name="pencil-outline" size={13} color={colors.brandPrimary} /><Text style={[s.link, { marginLeft: 4 }]}>Edit</Text></Pressable>
          </View>
          <Card style={{ marginTop: spacing.md }}>
            <InfoRow icon="call-outline" label="Mobile number" value={user?.mobile} />
            <InfoRow icon="mail-outline" label="Email address" value={user?.email ?? undefined} />
            <InfoRow icon="location-outline" label="Address" value={[user?.address, user?.city, user?.state, user?.pincode].filter(Boolean).join(", ")} />
            <InfoRow icon="calendar-outline" label="Member since" value={fmtDate(user?.created_at)} />
          </Card>

          {pp ? (
            <>
              <SectionLabel style={{ marginTop: spacing.xl }}>Professional Information</SectionLabel>
              <Card>
                <InfoRow icon="pricetag-outline" label="Partner type" value={partnerTypeName(pp.partner_type)} />
                {pp.company_name ? <InfoRow icon="business-outline" label="Company / Firm" value={pp.company_name} /> : null}
                {pp.business_type ? <InfoRow icon="git-network-outline" label="Business type" value={label(BUSINESS_TYPES, pp.business_type)} /> : null}
                {pp.partner_type === "influencer" ? (
                  <>
                    <InfoRow icon="logo-instagram" label="Instagram" value={pp.instagram_link ?? undefined} />
                    <InfoRow icon="logo-youtube" label="YouTube" value={pp.youtube_link ?? undefined} />
                    <InfoRow icon="logo-facebook" label="Facebook" value={pp.facebook_link ?? undefined} />
                  </>
                ) : null}
                <InfoRow icon="people-outline" label="Associated employee" value={pp.employee_name || "None"} />
              </Card>

              <SectionLabel style={{ marginTop: spacing.xl }}>Documents</SectionLabel>
              <Card>
                {(pp.documents ?? []).length ? (
                  (pp.documents ?? []).map((d) => (
                    <Pressable key={d.id} onPress={() => Linking.openURL(`${BASE_URL}/storage/${d.file_path}`)} style={[s.between, { paddingVertical: 8 }]} testID={`profile-doc-${d.id}`}>
                      <Text style={[s.body, { fontSize: 14, flex: 1 }]}>{label({}, d.document_type)}</Text>
                      <Badge label={label({}, d.status)} tone={/verified|approved/i.test(d.status) ? "success" : "warning"} small />
                    </Pressable>
                  ))
                ) : (
                  <Text style={s.bodyMuted}>No documents uploaded.</Text>
                )}
              </Card>
            </>
          ) : null}

          <SectionLabel style={{ marginTop: spacing.xl }}>Settings & More</SectionLabel>
          <Card style={{ padding: 4 }}>
            {MENU.map((m, i) => (
              <Pressable key={m.label} onPress={() => router.push(m.route as any)} style={[styles.menu, i < MENU.length - 1 && styles.menuBorder]} testID={m.testID}>
                <Ionicons name={m.icon as any} size={18} color={colors.brandPrimary} />
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
  photo: { width: 64, height: 64, borderRadius: 32 },
  menuText: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.onSurface },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.lg },
  handle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  sheetTitle: { fontFamily: fonts.display, fontSize: 26, color: colors.onSurface, marginBottom: 4 },
}));
