import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { post, User } from "@/src/api";
import { useAuth } from "@/src/auth";
import { Button, Header, ScreenTitle } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

// Screen 3 · Verify OTP
export default function VerifyOtp() {
  const { code, phone } = useLocalSearchParams<{ code: string; phone: string }>();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const { signIn } = useAuth();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [seconds, setSeconds] = useState(29);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const verify = useMutation({
    mutationFn: () => post<{ access_token: string; user: User }>("/auth/verify-otp", { country_code: code, phone, otp }),
    onSuccess: async (data) => {
      await signIn(data.access_token, data.user);
      toast.show("Number verified", "success");
      router.replace(data.user.profile_completed ? "/(tabs)/home" : "/(auth)/profile-type");
    },
    onError: (e: Error) => setError(e.message),
  });

  const resend = useMutation({
    mutationFn: () => post("/auth/request-otp", { country_code: code, phone }),
    onSuccess: () => {
      setSeconds(29);
      setOtp("");
      setError(undefined);
      toast.show("A new code has been sent", "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const submit = () => {
    if (otp.length !== 6) return setError("Enter the 6-digit code");
    setError(undefined);
    verify.mutate();
  };

  return (
    <View style={styles.screen} testID="otp-screen">
      <Header showBell={false} />
      <KeyboardAwareScrollView bottomOffset={120} contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <ScreenTitle eyebrow="VERIFICATION" title="Verify OTP" subtitle={`Enter the 6-digit code sent to ${code} ${phone}`} />

        <Pressable onPress={() => inputRef.current?.focus()} style={styles.boxes} testID="otp-boxes">
          {Array.from({ length: 6 }).map((_, i) => {
            const ch = otp[i];
            const active = otp.length === i;
            return (
              <View key={i} style={[styles.box, active && styles.boxActive, !!error && styles.boxError]}>
                <Text style={styles.boxText}>{ch ?? ""}</Text>
              </View>
            );
          })}
        </Pressable>
        <TextInput
          ref={inputRef}
          testID="otp-input"
          value={otp}
          onChangeText={(v) => {
            setOtp(v.replace(/\D/g, "").slice(0, 6));
            setError(undefined);
          }}
          keyboardType="number-pad"
          maxLength={6}
          autoFocus
          style={styles.hiddenInput}
          onSubmitEditing={submit}
        />
        {error ? (
          <Text style={styles.error} testID="otp-error">
            {error}
          </Text>
        ) : (
          <Text style={styles.hint}>The code expires in 5 minutes. Demo code: 111111</Text>
        )}

        <Pressable onPress={() => router.back()} style={styles.changeRow} testID="change-number-button">
          <Text style={styles.changeText}>Change mobile number</Text>
        </Pressable>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Button label="Verify" icon="checkmark" onPress={submit} loading={verify.isPending} testID="otp-verify-button" variant="gold" />
          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn{"'"}t receive the code? </Text>
            {seconds > 0 ? (
              <Text style={[styles.resendText, { color: colors.onSurface, fontFamily: fonts.semibold }]} testID="otp-countdown">
                Resend in 0:{String(seconds).padStart(2, "0")}
              </Text>
            ) : (
              <Pressable onPress={() => resend.mutate()} testID="otp-resend-button" disabled={resend.isPending}>
                <Text style={[styles.resendText, { color: colors.brandPrimary, fontFamily: fonts.semibold }]}>Resend OTP</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surface },
  boxes: { flexDirection: "row", gap: 10, justifyContent: "space-between" },
  box: { flex: 1, height: 60, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  boxActive: { borderColor: colors.brandPrimary, borderWidth: 1.5 },
  boxError: { borderColor: colors.error },
  boxText: { fontFamily: fonts.display, fontSize: 28, color: colors.onSurface },
  hiddenInput: { position: "absolute", opacity: 0, height: 1, width: 1 },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.error, marginTop: 12 },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginTop: 12 },
  changeRow: { marginTop: spacing.xl, alignSelf: "flex-start", minHeight: 44, justifyContent: "center" },
  changeText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.brandPrimary, textDecorationLine: "underline" },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, backgroundColor: colors.surface },
  resendRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 16, minHeight: 24 },
  resendText: { fontFamily: fonts.body, fontSize: 13, color: colors.muted },
}));
