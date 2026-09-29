import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LEAF } from "@/src/brand";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */
export function Header({
  title,
  showBack = true,
  showBell = true,
  right,
  onBack,
}: {
  title?: string;
  showBack?: boolean;
  showBell?: boolean;
  right?: React.ReactNode;
  onBack?: () => void;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 6 }]} testID="app-header">
      <View style={styles.headerSide}>
        {showBack ? (
          <Pressable
            testID="header-back-button"
            onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/home")))}
            hitSlop={8}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.headerCenter}>
        {title ? (
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
        ) : (
          <Image source={LEAF} style={{ width: 26, height: 26 }} contentFit="contain" />
        )}
      </View>
      <View style={[styles.headerSide, { alignItems: "flex-end" }]}>
        {right ??
          (showBell ? (
            <Pressable testID="header-notifications-button" onPress={() => router.push("/notifications")} hitSlop={8} style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}>
              <Ionicons name="notifications-outline" size={22} color={colors.onSurface} />
            </Pressable>
          ) : null)}
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Typography                                                          */
/* ------------------------------------------------------------------ */
export function ScreenTitle({ title, subtitle, eyebrow }: { title: string; subtitle?: string; eyebrow?: string }) {
  const styles = useStyles();
  return (
    <View style={{ marginBottom: spacing.xl }}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.h1} testID="screen-title">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function SectionLabel({ children, style }: { children: string; style?: TextStyle }) {
  const styles = useStyles();
  return (
    <Text style={[styles.sectionLabel, style]} testID={`section-${children.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
      {children.toUpperCase()}
    </Text>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */
export function Button({
  label,
  onPress,
  icon,
  variant = "primary",
  loading,
  disabled,
  testID,
  style,
  small,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  variant?: "primary" | "secondary" | "ghost" | "gold" | "danger";
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  style?: ViewStyle;
  small?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const bg = { primary: colors.brandPrimary, secondary: colors.surfaceSecondary, ghost: "transparent", gold: colors.brandSecondary, danger: colors.errorSoft }[variant];
  const fg = { primary: colors.onBrandPrimary, secondary: colors.brandPrimary, ghost: colors.brandPrimary, gold: colors.onBrandSecondary, danger: colors.error }[variant];
  const border = variant === "secondary" ? colors.brandPrimary : "transparent";
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: fg }]}>{label.toUpperCase()}</Text>
          {icon ? <Ionicons name={icon} size={small ? 15 : 18} color={fg} /> : null}
        </>
      )}
    </Pressable>
  );
}

export function StickyFooter({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  return <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>{children}</View>;
}

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */
export function Field({
  label,
  icon,
  error,
  hint,
  rightIcon,
  containerStyle,
  ...props
}: TextInputProps & { label?: string; icon?: IconName; error?: string; hint?: string; rightIcon?: IconName; containerStyle?: ViewStyle }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ marginBottom: spacing.lg }, containerStyle]}>
      {label ? <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text> : null}
      <View style={[styles.inputWrap, focused && styles.inputFocused, !!error && styles.inputError, props.multiline && { alignItems: "flex-start", minHeight: 104 }]}>
        {icon ? <Ionicons name={icon} size={18} color={focused ? colors.brandPrimary : colors.muted} style={props.multiline && { marginTop: 2 }} /> : null}
        <TextInput
          placeholderTextColor={colors.muted}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, props.multiline && { minHeight: 80, textAlignVertical: "top" }, props.style]}
        />
        {rightIcon ? <Ionicons name={rightIcon} size={18} color={colors.muted} /> : null}
      </View>
      {error ? (
        <Text style={styles.errorText} testID="field-error">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = "Select",
  icon,
  error,
  testID,
}: {
  label?: string;
  value?: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: IconName;
  error?: string;
  testID?: string;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? <Text style={styles.fieldLabel}>{label.toUpperCase()}</Text> : null}
      <Pressable testID={testID} onPress={() => setOpen(true)} style={({ pressed }) => [styles.inputWrap, !!error && styles.inputError, pressed && styles.pressed]}>
        {icon ? <Ionicons name={icon} size={18} color={colors.muted} /> : null}
        <Text style={[styles.input, { paddingVertical: 0 }, !value && { color: colors.muted }]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} testID="select-backdrop">
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{label || placeholder}</Text>
            <ScrollView style={{ maxHeight: 380 }}>
              {options.map((o) => {
                const selected = o === value;
                return (
                  <Pressable
                    key={o}
                    testID={`select-option-${o.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    onPress={() => {
                      onChange(o);
                      setOpen(false);
                    }}
                    style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
                  >
                    <Text style={[styles.optionText, selected && { color: colors.brandPrimary, fontFamily: fonts.semibold }]}>{o}</Text>
                    {selected ? <Ionicons name="checkmark" size={18} color={colors.brandPrimary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function SearchBar({ value, onChange, placeholder = "Search", testID, onFilter }: { value: string; onChange: (v: string) => void; placeholder?: string; testID?: string; onFilter?: () => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
      <View style={[styles.inputWrap, { flex: 1, minHeight: 46, paddingVertical: 0 }]}>
        <Ionicons name="search-outline" size={18} color={colors.muted} />
        <TextInput testID={testID} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} style={[styles.input, { fontSize: 14 }]} returnKeyType="search" />
        {value ? (
          <Pressable onPress={() => onChange("")} hitSlop={8} testID="search-clear-button">
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>
      {onFilter ? (
        <Pressable onPress={onFilter} style={styles.filterBtn} testID="filter-button">
          <Ionicons name="options-outline" size={20} color={colors.onSurface} />
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Chips / Badges                                                      */
/* ------------------------------------------------------------------ */
export function ChipRow<T extends string>({ options, value, onChange, counts, testIDPrefix = "chip" }: { options: T[]; value: T; onChange: (v: T) => void; counts?: Partial<Record<T, number>>; testIDPrefix?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 56, flexGrow: 0, flexShrink: 0 }} contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.lg, alignItems: "center" }}>
      {options.map((o) => {
        const selected = o === value;
        return (
          <Pressable key={o} testID={`${testIDPrefix}-${o.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} onPress={() => onChange(o)} style={[styles.chip, selected && styles.chipSelected]}>
            <Text style={[styles.chipText, selected && { color: colors.onBrandPrimary }]}>
              {o}
              {counts && counts[o] !== undefined ? ` (${counts[o]})` : ""}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const STATUS_TONE: Record<string, "success" | "warning" | "error" | "info" | "gold" | "muted" | "brand"> = {
  "In Progress": "warning",
  Converted: "success",
  "Not Matured": "muted",
  Attended: "success",
  Pending: "warning",
  Completed: "success",
  Available: "success",
  Booked: "warning",
  Reserved: "gold",
  Sold: "muted",
  Hot: "error",
  Warm: "warning",
  Cold: "info",
  Verified: "success",
  Uploaded: "brand",
  Required: "error",
  Optional: "muted",
  "Current Visit": "gold",
};

export function Badge({ label, tone, testID, small }: { label: string; tone?: keyof typeof TONES; testID?: string; small?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const t = tone ?? STATUS_TONE[label] ?? "brand";
  const TONES_C = {
    success: [colors.forestSoft, colors.success],
    warning: [colors.warningSoft, colors.warning],
    error: [colors.errorSoft, colors.error],
    info: [colors.infoSoft, colors.info],
    gold: [colors.goldSoft, colors.warning],
    muted: [colors.surfaceTertiary, colors.muted],
    brand: [colors.forestSoft, colors.brandPrimary],
  } as const;
  const [bg, fg] = TONES_C[t];
  return (
    <View style={[styles.badge, small && { paddingVertical: 2, paddingHorizontal: 8 }, { backgroundColor: bg }]} testID={testID}>
      <Text style={[styles.badgeText, small && { fontSize: 10 }, { color: fg }]}>{label}</Text>
    </View>
  );
}
const TONES = { success: 1, warning: 1, error: 1, info: 1, gold: 1, muted: 1, brand: 1 };

/* ------------------------------------------------------------------ */
/* Cards / rows / misc                                                 */
/* ------------------------------------------------------------------ */
export function Card({ children, style, onPress, testID }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void; testID?: string }) {
  const styles = useStyles();
  if (onPress) {
    return (
      <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.92, transform: [{ scale: 0.995 }] }]}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[styles.card, style]} testID={testID}>
      {children}
    </View>
  );
}

export function InfoRow({ icon, label, value, testID }: { icon?: IconName; label: string; value?: string; testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow} testID={testID}>
      {icon ? (
        <View style={styles.infoIcon}>
          <Ionicons name={icon} size={16} color={colors.brandPrimary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label.toUpperCase()}</Text>
        <Text style={styles.infoValue}>{value || "—"}</Text>
      </View>
    </View>
  );
}

export function Avatar({ name, size = 44, tone = "brand" }: { name?: string; size?: number; tone?: "brand" | "gold" }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const initials = (name || "CG")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: tone === "gold" ? colors.goldSoft : colors.forestSoft }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.36, color: tone === "gold" ? colors.warning : colors.brandPrimary }]}>{initials}</Text>
    </View>
  );
}

export function EmptyState({ icon = "leaf-outline", title, body, action }: { icon?: IconName; title: string; body?: string; action?: React.ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.empty} testID="empty-state">
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.brandTertiary} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

export function Loading() {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: 48, alignItems: "center" }} testID="loading-indicator">
      <ActivityIndicator color={colors.brandPrimary} />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <EmptyState icon="cloud-offline-outline" title="Something went wrong" body={message} action={<Button label="Retry" onPress={onRetry} variant="secondary" small testID="retry-button" />} />;
}

export function StepIndicator({ step, total = 3 }: { step: number; total?: number }) {
  const styles = useStyles();
  return (
    <View style={styles.stepsRow} testID="step-indicator">
      <Text style={styles.stepLabel}>STEP {step} OF {total}</Text>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[styles.stepBar, i < step && styles.stepBarActive]} />
        ))}
      </View>
    </View>
  );
}

export function OptionTile({ label, icon, selected, onPress, testID, style }: { label: string; icon?: IconName; selected: boolean; onPress: () => void; testID?: string; style?: ViewStyle }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.tile, selected && styles.tileSelected, pressed && styles.pressed, style]}>
      {icon ? (
        <View style={[styles.tileIcon, selected && { backgroundColor: colors.brandPrimary }]}>
          <Ionicons name={icon} size={18} color={selected ? colors.onBrandPrimary : colors.brandPrimary} />
        </View>
      ) : null}
      <Text style={[styles.tileText, selected && { color: colors.brandPrimary, fontFamily: fonts.semibold }]}>{label}</Text>
    </Pressable>
  );
}

export function FAB({ onPress, icon = "add", testID }: { onPress: () => void; icon?: IconName; testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} style={({ pressed }) => [styles.fab, pressed && { opacity: 0.9 }]}>
      <Ionicons name={icon} size={26} color={colors.onBrandSecondary} />
    </Pressable>
  );
}

export function Divider() {
  const styles = useStyles();
  return <View style={styles.divider} />;
}

export function Stat({ value, label, tone = "brand", testID }: { value: string | number; label: string; tone?: "brand" | "gold" | "muted"; testID?: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const color = tone === "gold" ? colors.brandSecondary : tone === "muted" ? colors.muted : colors.brandPrimary;
  return (
    <View style={styles.stat} testID={testID}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
const useStyles = makeStyles((colors) => ({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingBottom: 10, backgroundColor: colors.surface },
  headerSide: { width: 64, justifyContent: "center" },
  headerCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.medium, fontSize: 15, color: colors.onSurface, letterSpacing: 0.3 },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 22 },
  pressed: { opacity: 0.7 },

  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 2, color: colors.brandSecondary, marginBottom: 6 },
  h1: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40, color: colors.onSurface },
  subtitle: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 6 },
  sectionLabel: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.8, color: colors.onSurfaceTertiary, marginBottom: spacing.md, marginTop: spacing.sm },

  button: { minHeight: 52, borderRadius: radius.md, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 20, borderWidth: 1.5, shadowColor: colors.forestDeep, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  buttonSmall: { minHeight: 40, paddingHorizontal: 14, borderRadius: radius.sm + 2, gap: 6 },
  buttonText: { fontFamily: fonts.semibold, fontSize: 14, letterSpacing: 1.6 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },

  fieldLabel: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.4, color: colors.onSurfaceTertiary, marginBottom: 8 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, minHeight: 52, paddingVertical: 4 },
  inputFocused: { borderColor: colors.brandPrimary, borderWidth: 1.5 },
  inputError: { borderColor: colors.error },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.onSurface, paddingVertical: 10 },
  errorText: { fontFamily: fonts.body, fontSize: 12, color: colors.error, marginTop: 6 },
  hintText: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 6 },
  filterBtn: { width: 46, height: 46, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },

  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, paddingHorizontal: spacing.lg, paddingTop: 10 },
  sheetHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  sheetTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.onSurface, marginBottom: 12 },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, paddingHorizontal: 14, borderRadius: radius.md },
  optionSelected: { backgroundColor: colors.forestSoft },
  optionText: { fontFamily: fonts.body, fontSize: 15, color: colors.onSurface },

  chip: { height: 36, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border, justifyContent: "center", flexShrink: 0 },
  chipSelected: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  chipText: { fontFamily: fonts.medium, fontSize: 13, color: colors.onSurfaceTertiary },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: "flex-start" },
  badgeText: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.4 },

  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, shadowColor: colors.forestDeep, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  infoRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 8 },
  infoIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.forestSoft, alignItems: "center", justifyContent: "center", marginTop: 2 },
  infoLabel: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.2, color: colors.muted, marginBottom: 2 },
  infoValue: { fontFamily: fonts.body, fontSize: 15, color: colors.onSurface, lineHeight: 21 },
  avatar: { alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.semibold },

  empty: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 32 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.oliveSoft, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 24, color: colors.onSurface, textAlign: "center" },
  emptyBody: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, textAlign: "center", marginTop: 6, lineHeight: 20 },

  stepsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  stepLabel: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 2, color: colors.brandSecondary },
  stepBar: { width: 26, height: 3, borderRadius: 2, backgroundColor: colors.border },
  stepBarActive: { backgroundColor: colors.brandSecondary },

  tile: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1.5, borderColor: colors.border, minHeight: 60, shadowColor: colors.forestDeep, shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  tileSelected: { borderColor: colors.brandPrimary, backgroundColor: colors.forestSoft },
  tileIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  tileText: { fontFamily: fonts.medium, fontSize: 14, color: colors.onSurface, flex: 1 },

  fab: { position: "absolute", right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center", shadowColor: colors.onSurface, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.md },
  stat: { flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.border },
  statValue: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36 },
  statLabel: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.2, color: colors.muted, marginTop: 4 },
}));

export const useScreenStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  h2: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, color: colors.onSurface },
  h3: { fontFamily: fonts.displaySemi, fontSize: 20, lineHeight: 26, color: colors.onSurface },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 24, color: colors.onSurface },
  bodyMuted: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.muted },
  caption: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  name: { fontFamily: fonts.semibold, fontSize: 15, color: colors.onSurface },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 2 },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.brandPrimary },
  row: { flexDirection: "row", alignItems: "center" },
  between: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
}));
