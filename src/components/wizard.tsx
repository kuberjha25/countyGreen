import Ionicons from "@react-native-vector-icons/ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Header, ScreenTitle, SectionLabel, StepIndicator, useScreenStyles } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export type WizardStep = {
  key: string;
  title: string;
  subtitle?: string;
  render: () => React.ReactNode;
  validate?: () => string | undefined; // returns error message
  summary: () => { label: string; value?: string }[];
};

type Props = {
  title: string;
  steps: WizardStep[];
  onSubmit: () => void;
  submitting?: boolean;
  submitLabel?: string;
  success?: { title: string; body: string; primary: { label: string; onPress: () => void; testID?: string }; secondary?: { label: string; onPress: () => void; testID?: string }; meta?: { label: string; value: string }[] };
  done: boolean;
  onError: (msg: string) => void;
  testID?: string;
};

// Multi-step form frame: step is URL-driven (?step=1..n, review, success) so
// every step is a distinct, linkable screen.
export function FormWizard({ title, steps, onSubmit, submitting, submitLabel = "Submit", success, done, onError, testID }: Props) {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ step?: string }>();
  const total = steps.length;
  const stepParam = params.step ?? "1";
  const isReview = stepParam === "review";
  const isSuccess = done || stepParam === "success";
  const index = Math.min(Math.max(parseInt(stepParam, 10) || 1, 1), total) - 1;
  const step = steps[index];

  const go = (next: string) => router.setParams({ step: next });

  const next = () => {
    const err = step.validate?.();
    if (err) return onError(err);
    go(index + 1 < total ? String(index + 2) : "review");
  };
  const back = () => {
    if (isReview) return go(String(total));
    if (index === 0) return router.back();
    go(String(index));
  };

  const summaries = useMemo(() => steps.map((st) => ({ title: st.title, rows: st.summary() })), [steps]);

  if (isSuccess && success) {
    return (
      <View style={s.screen} testID={`${testID}-success`}>
        <Header showBack={false} showBell={false} />
        <Animated.View entering={FadeInDown.duration(500)} style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={40} color={colors.onBrandPrimary} />
          </View>
          <Text style={styles.successTitle}>{success.title}</Text>
          <Text style={styles.successBody}>{success.body}</Text>
          {success.meta?.length ? (
            <View style={styles.metaCard}>
              {success.meta.map((m) => (
                <View key={m.label} style={styles.metaRow}>
                  <Text style={styles.metaLabel}>{m.label.toUpperCase()}</Text>
                  <Text style={styles.metaValue}>{m.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </Animated.View>
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 16, gap: 10 }}>
          <Button label={success.primary.label} onPress={success.primary.onPress} testID={success.primary.testID ?? "success-primary-button"} />
          {success.secondary ? <Button label={success.secondary.label} variant="ghost" onPress={success.secondary.onPress} testID={success.secondary.testID ?? "success-secondary-button"} /> : null}
        </View>
      </View>
    );
  }

  return (
    <View style={s.screen} testID={testID}>
      <Header showBell={false} onBack={back} />
      <KeyboardAwareScrollView bottomOffset={120} contentContainerStyle={[s.content, { paddingBottom: 130, paddingTop: 8 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <StepIndicator step={isReview ? total + 1 : index + 1} total={total + 1} />
        {isReview ? (
          <>
            <ScreenTitle title="Review & Submit" subtitle={`Please confirm the details below before submitting your ${title.toLowerCase()}.`} />
            {summaries.map((sec, i) => (
              <View key={sec.title} style={styles.reviewCard} testID={`review-section-${i}`}>
                <View style={[s.between, { marginBottom: 8 }]}>
                  <Text style={styles.reviewTitle}>{sec.title}</Text>
                  <Pressable onPress={() => go(String(i + 1))} hitSlop={8} testID={`review-edit-${i}`} style={s.row}>
                    <Ionicons name="pencil-outline" size={14} color={colors.brandPrimary} />
                    <Text style={[s.link, { marginLeft: 4 }]}>Edit</Text>
                  </Pressable>
                </View>
                {sec.rows.map((r) => (
                  <View key={r.label} style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>{r.label}</Text>
                    <Text style={styles.reviewValue} numberOfLines={3}>
                      {r.value || "—"}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : (
          <>
            <ScreenTitle eyebrow={title.toUpperCase()} title={step.title} subtitle={step.subtitle} />
            <SectionLabel>{step.title}</SectionLabel>
            {step.render()}
          </>
        )}
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {isReview ? (
            <Button label={submitLabel} icon="checkmark" variant="gold" onPress={onSubmit} loading={submitting} testID="wizard-submit-button" />
          ) : (
            <View style={{ flexDirection: "row", gap: 10 }}>
              {index > 0 ? <Button label="Back" variant="secondary" onPress={back} testID="wizard-back-button" style={{ flex: 1 }} /> : null}
              <Button label={index + 1 === total ? "Review" : "Continue"} icon="arrow-forward" onPress={next} testID="wizard-next-button" style={{ flex: 2 }} />
            </View>
          )}
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.divider },
  reviewCard: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginBottom: spacing.md },
  reviewTitle: { fontFamily: fonts.displaySemi, fontSize: 19, color: colors.onSurface },
  reviewRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 7, borderTopWidth: 1, borderTopColor: colors.divider },
  reviewLabel: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, flex: 1 },
  reviewValue: { fontFamily: fonts.medium, fontSize: 13, color: colors.onSurface, flex: 1.4, textAlign: "right" },
  successWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  successIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center", marginBottom: spacing.xl },
  successTitle: { fontFamily: fonts.display, fontSize: 34, color: colors.onSurface, textAlign: "center" },
  successBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.muted, textAlign: "center", marginTop: 10 },
  metaCard: { marginTop: spacing.xl, alignSelf: "stretch", backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  metaRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6 },
  metaLabel: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 1.2, color: colors.muted },
  metaValue: { fontFamily: fonts.medium, fontSize: 13, color: colors.onSurface },
}));
