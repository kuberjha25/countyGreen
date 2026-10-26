import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { errorMessage } from "@/src/api";
import { BRAND, IMAGES, LOGO_WHITE } from "@/src/brand";
import { Button, Field, Select } from "@/src/components/ui";
import { fonts, makeStyles, spacing, useTheme } from "@/src/theme";
import { sendOtp } from "@/src/store/authSlice";
import { useRun } from "@/src/store/useRun";
import { useToast } from "@/src/toast";

const CODES = ["+91"]; // County Green logins are Indian 10-digit mobile numbers

// Screen 2 · Welcome / Mobile Number
export default function Login() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const [code, setCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | undefined>();
  const { height } = useWindowDimensions();
  // Shorter hero on small phones so the form and Continue fit without scrolling.
  const heroHeight = Math.min(340, Math.max(240, Math.round(height * 0.36)));

  const [run, sending] = useRun();
  const request = {
    isPending: sending,
    mutate: async () => {
      try {
        await run(sendOtp(phone));
        toast.show("Verification code sent", "success");
        router.push({ pathname: "/(auth)/otp", params: { code, phone } });
      } catch (e) {
        toast.show(errorMessage(e), "error");
      }
    },
  };

  const submit = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) return setError("Enter a valid 10-digit mobile number");
    setError(undefined);
    request.mutate();
  };

  return (
    <View style={styles.screen} testID="login-screen">
      {/* Continue sits in the form, right below the mobile field, so it can never cover the input. */}
      <KeyboardAwareScrollView bottomOffset={96} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { height: heroHeight }]}>
          <Image source={IMAGES["hero-security"]} style={styles.heroImg} contentFit="cover" />
          <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.heroImg} />
          <View style={[styles.heroContent, { paddingTop: insets.top + 16 }]}>
            <Image source={LOGO_WHITE} style={{ width: 120, height: 104 }} contentFit="contain" />
            <View>
              <Text style={styles.heroTag}>{BRAND.tagline}</Text>
              <Text style={styles.heroMeta}>{BRAND.positioning.toUpperCase()}</Text>
            </View>
          </View>
        </View>
        <View style={styles.form}>
          <Text style={styles.eyebrow}>LOGIN OR REGISTER</Text>
          <Text style={styles.h1}>Welcome</Text>
          <Text style={styles.sub}>Enter your mobile number to login or register as a County Green partner — Channel Partner, Broker, Influencer or Freelancer.</Text>

          <Text style={styles.label}>MOBILE NUMBER</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ width: 104 }}>
              <Select value={code} options={CODES} onChange={setCode} testID="country-code-select" />
            </View>
            <View style={{ flex: 1 }}>
              <Field testID="phone-input" placeholder="10-digit mobile number" keyboardType="number-pad" value={phone} onChangeText={(v) => setPhone(v.replace(/\D/g, "").slice(0, 10))} error={error} maxLength={10} returnKeyType="done" onSubmitEditing={submit} />
            </View>
          </View>
          <View style={styles.hintRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.muted} />
            <Text style={styles.hint}>We{"'"}ll send a one-time verification code by SMS.</Text>
          </View>
          <Button label="Continue" icon="arrow-forward" onPress={submit} loading={request.isPending} testID="login-continue-button" style={{ marginTop: spacing.xl }} />
          <Text style={styles.terms}>
            By continuing, you agree to our{" "}
            <Text style={styles.termsLink} onPress={() => router.push("/terms")} testID="login-terms-link">
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text style={styles.termsLink} onPress={() => router.push("/terms")}>
              Privacy Policy
            </Text>
            .
          </Text>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surface },
  hero: { backgroundColor: colors.forestDeep },
  heroImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  heroContent: { flex: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, justifyContent: "space-between" },
  heroTag: { fontFamily: fonts.displayItalic, fontSize: 28, color: colors.onImage },
  heroMeta: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 2.4, color: colors.brandSecondary, marginTop: 6 },
  form: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 2, color: colors.brandSecondary, marginBottom: 6 },
  h1: { fontFamily: fonts.display, fontSize: 36, color: colors.onSurface },
  sub: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 6, marginBottom: spacing.lg },
  label: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.4, color: colors.onSurfaceTertiary, marginBottom: 8 },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -4 },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  terms: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: "center", marginTop: 14 },
  termsLink: { color: colors.brandPrimary, fontFamily: fonts.semibold },
}));
