import Ionicons from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { MASTERS } from "@/src/brand";
import { BottomNav, Header, ScreenTitle, useScreenStyles } from "@/src/components/ui";
import { useLookups } from "@/src/lookups";
import { makeStyles, radius, useTheme } from "@/src/theme";

// Admin · Masters — option lists used by the Admin Panel and the mobile app.
export default function Masters() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const lookups = useLookups();
  return (
    <View style={s.screen} testID="masters-screen">
      <Header title="Masters" />
      <ScrollView contentContainerStyle={[s.content, { paddingTop: 8 }]}>
        <ScreenTitle title="Masters" subtitle="Options shown in lead, visit and filter screens. Changes appear in the mobile app immediately." />
        <View style={{ gap: 10 }}>
          {MASTERS.map((m) => (
            <Pressable key={m.key} onPress={() => router.push({ pathname: "/admin/masters/[key]", params: { key: m.key } })} style={({ pressed }) => [styles.card, pressed && { opacity: 0.92 }]} testID={`master-${m.key}`}>
              <View style={styles.icon}><Ionicons name={m.icon as any} size={20} color={colors.brandPrimary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{m.label}</Text>
                <Text style={s.meta} numberOfLines={1}>{lookups[m.key].length} options · {lookups[m.key].slice(0, 3).join(", ")}{lookups[m.key].length > 3 ? "…" : ""}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <BottomNav active="profile" />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.forestSoft, alignItems: "center", justifyContent: "center" },
}));
