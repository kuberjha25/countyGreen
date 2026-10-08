// Design tokens for this app. Light theme only.Always modify the colors and theme to Dark, Light or Dark and Light according to the design guidelines.
//
// The keys match the "color" block of /app/design_guidelines.json. Fill the
// values from that file (or from the user's brand colors). Keep every key; do
// not add a second theme or colors file; do not write color literals in
// components.
//
// How the names work: a plain key is a background, and its `on` partner is the
// text or icon color that sits on top of it. Always use them as a pair.
//   <View style={{ backgroundColor: colors.brandPrimary }}>
//     <Text style={{ color: colors.onBrandPrimary }}>Continue</Text>
//   </View>
//
// Styling a screen or component: build the sheet with makeStyles so colors
// and layout live together and follow the active scheme:
//   const useStyles = makeStyles((colors) => ({
//     card: { backgroundColor: colors.surfaceSecondary, padding: 16 },
//     title: { color: colors.onSurfaceSecondary, fontSize: 16 },
//   }));
//   function Screen() {
//     const styles = useStyles();
//     return <View style={styles.card}><Text style={styles.title}>Hi</Text></View>;
//   }
// For color props that are not styles (icon color, placeholderTextColor,
// ActivityIndicator) read useTheme().colors inside the component.
// Never call StyleSheet.create with color values at module level; it cannot
// follow the scheme.
//
// To support dark mode later: add `dark` to `themes` with every key filled.
// Nothing else changes; the device setting takes over automatically.
// Feel free to add as many new colors as you need to support the design guidelines.

import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

// County Green — Editorial Light. Ivory canvas, forest green primary, warm gold
// accent, olive leaf as tertiary. Values from /app/design_guidelines.json.
const light = {
  surface: "#F3F3E6",
  onSurface: "#1C1C15",
  surfaceSecondary: "#FFFFFF",
  onSurfaceSecondary: "#1C1C15",
  surfaceTertiary: "#E8E8DF",
  onSurfaceTertiary: "#4B4A38",
  surfaceInverse: "#0F4A3C",
  onSurfaceInverse: "#FFFFFF",
  muted: "#71716A",

  brand: "#0F4A3C",
  onBrand: "#FFFFFF",
  brandPrimary: "#0F4A3C",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#C9A24A",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#999907",
  onBrandTertiary: "#1C1C15",

  success: "#276749",
  onSuccess: "#FFFFFF",
  warning: "#906030",
  onWarning: "#FFFFFF",
  error: "#9B2C2C",
  onError: "#FFFFFF",
  info: "#4A5568",
  onInfo: "#FFFFFF",

  border: "#D8D8CF",
  borderStrong: "#4B4A38",
  divider: "#E8E8DF",

  // Extra brand moments
  forestDeep: "#0A3A2F", // splash / inverse gradients
  forestSoft: "#DCE8E2", // soft green fills (success-ish tints, selected chips)
  goldSoft: "#F3E9D2", // gold tint fills (badges, highlights)
  oliveSoft: "#EEF0D8", // olive tint fills
  errorSoft: "#F6E1E1",
  warningSoft: "#F3E6D8",
  infoSoft: "#E4E7EC",
  overlay: "rgba(28,28,21,0.45)", // modal backdrop
  onImage: "#FFFFFF", // text on photography with scrim
  onImageMuted: "rgba(255,255,255,0.78)",
  scrimStart: "rgba(10,58,47,0)",
  scrimEnd: "rgba(10,58,47,0.92)",
};

// Font families loaded in app/_layout.tsx via expo-font.
export const fonts = {
  display: "Cormorant-Medium",
  displaySemi: "Cormorant-SemiBold",
  displayItalic: "Cormorant-Italic",
  body: "Jakarta-Regular",
  medium: "Jakarta-Medium",
  semibold: "Jakarta-SemiBold",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const radius = { sm: 6, md: 12, lg: 20, pill: 999 };

export type ThemeColors = typeof light;

export const defaultScheme = "light" satisfies ColorScheme;

export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

// In-app theme toggle, only after `dark` exists in `themes`. Call
// setColorScheme("dark"), setColorScheme("light"), or setColorScheme(null) to
// follow the device. Every useTheme() consumer re-renders. Persisting the
// choice and re-applying it on launch is the toggle's job.
export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme);
}

// Keep native surfaces (alerts, pickers, navigation chrome) on the schemes this
// app ships: light only forces light; once `dark` exists the device decides.
// Optional call because react-native-web does not implement it.
setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

// Themed StyleSheet: returns a hook that builds the sheet from the active
// scheme's colors and memoizes it until the scheme changes.
export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}


