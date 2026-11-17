import Ionicons from "@react-native-vector-icons/ionicons";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";

import { TABS } from "@/src/nav";
import { fonts, useTheme } from "@/src/theme";
import { promptWhatsNew } from "@/src/whatsNew";

const isIOS26 = Platform.OS === "ios" && parseInt(String(Platform.Version), 10) >= 26;

export default function TabsLayout() {
  const { colors } = useTheme();

  // Signed-in area: tell the user about news / events posted since the last check.
  useEffect(() => {
    promptWhatsNew();
    const sub = AppState.addEventListener("change", (st) => st === "active" && promptWhatsNew());
    return () => sub.remove();
  }, []);

  if (isIOS26) {
    return (
      <NativeTabs tintColor={colors.brandPrimary}>
        {TABS.map((t) => (
          <NativeTabs.Trigger key={t.name} name={t.name}>
            <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={t.sf as any} />
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surfaceSecondary,
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.label,
            tabBarButtonTestID: `tab-${t.label.toLowerCase()}`,
            tabBarIcon: ({ color, focused }) => <Ionicons name={(focused ? t.active : t.icon) as any} size={22} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
