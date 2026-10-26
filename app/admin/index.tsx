import Ionicons from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { useAuth } from "@/src/auth";
import { Badge, BottomNav, Header, ScreenTitle, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Item = { title: string; body: string; icon: string; route: string; testID: string; soon?: boolean };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Access",
    items: [
      { title: "Role Management", body: "What each role can view, add, edit, delete, modify, assign and reassign", icon: "shield-checkmark-outline", route: "/admin/roles", testID: "admin-roles", soon: true },
      { title: "Staff", body: "County Green staff logins and their roles", icon: "people-circle-outline", route: "/admin/staff", testID: "admin-staff", soon: true },
    ],
  },
  {
    title: "Configuration",
    items: [
      { title: "Masters", body: "Customer category, preferred configuration, lead source, time slot", icon: "list-outline", route: "/admin/masters", testID: "admin-masters", soon: true },
      { title: "Our Products", body: "Add, edit or remove products", icon: "map-outline", route: "/admin/products", testID: "admin-products", soon: true },
      { title: "CP Registration Documents", body: "Which documents are shown and mandatory", icon: "document-lock-outline", route: "/admin/registration-docs", testID: "admin-reg-docs", soon: true },
      { title: "Content Management", body: "App content", icon: "newspaper-outline", route: "/admin/content", testID: "admin-content", soon: true },
    ],
  },
  {
    title: "Operations",
    items: [
      { title: "Registrations", body: "Registered channel partners, brokers, influencers and freelancers", icon: "person-add-outline", route: "/registrations", testID: "admin-registrations" },
      { title: "Availability Requests", body: "Requests with partner and assigned staff", icon: "hourglass-outline", route: "/availability", testID: "admin-availability", soon: true },
      { title: "Bulk Lead Upload", body: "Import leads from Excel / CSV", icon: "cloud-upload-outline", route: "/leads/bulk", testID: "admin-bulk", soon: true },
      { title: "Birthday & Anniversary Greetings", body: "Send greetings to partners on WhatsApp", icon: "gift-outline", route: "/greetings", testID: "admin-greetings", soon: true },
      { title: "MIS Reports", body: "Leads, visits and partner reports", icon: "stats-chart-outline", route: "/mis", testID: "admin-mis", soon: true },
    ],
  },
];

// Admin & Settings hub (staff logins). Items without a County Green API yet show "Coming soon".
export default function AdminHome() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  return (
    <View style={s.screen} testID="admin-screen">
      <Header title="Admin & Settings" />
      <ScrollView contentContainerStyle={[s.content, { paddingTop: 8 }]} showsVerticalScrollIndicator={false}>
        <ScreenTitle eyebrow={(user?.role?.name ?? "Staff").toUpperCase()} title="Admin & Settings" />
        {GROUPS.map((g) => (
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
                  {i.soon ? <Badge label="Coming soon" small /> : null}
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
