import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { get } from "@/src/api";
import { Action, ModuleKey } from "@/src/access";
import { useAuth, useCan } from "@/src/auth";
import { BottomNav, EmptyState, Header, ScreenTitle, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Item = { title: string; body: string; icon: string; route: string; module: ModuleKey; action: Action; testID: string };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Access",
    items: [
      { title: "Role Management", body: "What each role can view, add, edit, delete, modify, assign and reassign", icon: "shield-checkmark-outline", route: "/admin/roles", module: "roles", action: "view", testID: "admin-roles" },
      { title: "Staff", body: "County Green staff logins and their roles", icon: "people-circle-outline", route: "/admin/staff", module: "roles", action: "view", testID: "admin-staff" },
    ],
  },
  {
    title: "Configuration",
    items: [
      { title: "Masters", body: "Customer category, preferred configuration, lead source, time slot…", icon: "list-outline", route: "/admin/masters", module: "masters", action: "view", testID: "admin-masters" },
      { title: "Our Products", body: "Add, edit or remove products and their availability requests", icon: "map-outline", route: "/admin/products", module: "products", action: "edit", testID: "admin-products" },
      { title: "CP Registration Documents", body: "Which documents are shown and mandatory for each partner type", icon: "document-lock-outline", route: "/admin/registration-docs", module: "reg_documents", action: "view", testID: "admin-reg-docs" },
      { title: "Content Management", body: "About us, terms & conditions and news posts", icon: "newspaper-outline", route: "/admin/content", module: "content", action: "view", testID: "admin-content" },
    ],
  },
  {
    title: "Operations",
    items: [
      { title: "Availability Requests", body: "Product availability requests with partner and assigned staff", icon: "hourglass-outline", route: "/availability", module: "availability", action: "view", testID: "admin-availability" },
      { title: "Bulk Lead Upload", body: "Import leads from Excel / CSV", icon: "cloud-upload-outline", route: "/leads/bulk", module: "leads", action: "add", testID: "admin-bulk" },
      { title: "Birthday & Anniversary Greetings", body: "Send greetings to partners on WhatsApp", icon: "gift-outline", route: "/greetings", module: "greetings", action: "view", testID: "admin-greetings" },
      { title: "MIS Reports", body: "Leads, visits, partners and products reports", icon: "stats-chart-outline", route: "/mis", module: "mis", action: "view", testID: "admin-mis" },
    ],
  },
];

// Admin & Settings hub — every entry follows the signed-in role's permissions.
export default function AdminHome() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const can = useCan();
  const dash = useQuery({ queryKey: ["dashboard"], queryFn: () => get("/dashboard") });
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => can(i.module, i.action)) })).filter((g) => g.items.length);
  const badge: Record<string, string | undefined> = {
    "admin-staff": dash.data?.staff ? `${dash.data.staff} active` : undefined,
  };

  return (
    <View style={s.screen} testID="admin-screen">
      <Header title="Admin & Settings" />
      <ScrollView contentContainerStyle={[s.content, { paddingTop: 8 }]} showsVerticalScrollIndicator={false}>
        <ScreenTitle eyebrow={(user?.role_name ?? "Staff").toUpperCase()} title="Admin & Settings" subtitle="Manage roles, masters, products, documents and content. Changes apply to the mobile app straight away." />
        {!groups.length ? <EmptyState icon="lock-closed-outline" title="No admin access" body="Your role has no admin permissions. Ask Admin to update Role Management." /> : null}
        {groups.map((g) => (
          <View key={g.title} style={{ marginBottom: spacing.lg }}>
            <SectionLabel>{g.title}</SectionLabel>
            <View style={{ gap: 10 }}>
              {g.items.map((i) => (
                <Pressable key={i.route} onPress={() => router.push(i.route as any)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]} testID={i.testID}>
                  <View style={styles.icon}><Ionicons name={i.icon as any} size={20} color={colors.brandPrimary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{i.title}</Text>
                    <Text style={s.meta}>{i.body}</Text>
                  </View>
                  {badge[i.testID] ? <Text style={[s.caption, { color: colors.warning }]}>{badge[i.testID]}</Text> : null}
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      <BottomNav active="profile" />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.forestSoft, alignItems: "center", justifyContent: "center" },
}));
