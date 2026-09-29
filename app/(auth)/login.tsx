import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { post } from "@/src/api";
import { BRAND, IMAGES, LOGO_WHITE } from "@/src/brand";
import { Button, Field, Select } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

const CODES = ["+91", "+971", "+1", "+44", "+61", "+65"];

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

  const request = useMutation({
    mutationFn: () => post("/auth/request-otp", { country_code: code, phone }),
    onSuccess: () => {
      toast.show("Verification code sent", "success");
      router.push({ pathname: "/(auth)/otp", params: { code, phone } });
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const submit = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8) return setError("Enter a valid mobile number");
    setError(undefined);
    request.mutate();
  };

  return (
    <View style={styles.screen} testID="login-screen">
      <KeyboardAwareScrollView bottomOffset={120} contentContainerStyle={{ paddingBottom: 140 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
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
          <Text style={styles.sub}>Enter your mobile number to login or register as a County Green channel partner.</Text>

          <Text style={styles.label}>MOBILE NUMBER</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ width: 104 }}>
              <Select value={code} options={CODES} onChange={setCode} testID="country-code-select" />
            </View>
            <View style={{ flex: 1 }}>
              <Field testID="phone-input" placeholder="Enter mobile number" keyboardType="phone-pad" value={phone} onChangeText={setPhone} error={error} maxLength={12} returnKeyType="done" onSubmitEditing={submit} />
            </View>
          </View>
          <View style={styles.hintRow}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.muted} />
            <Text style={styles.hint}>We{"'"}ll send a one-time verification code by SMS.</Text>
          </View>
        </View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <Button label="Continue" icon="arrow-forward" onPress={submit} loading={request.isPending} testID="login-continue-button" />
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
          <View style={styles.socialRow}>
            {(["logo-instagram", "logo-facebook", "logo-youtube"] as const).map((n) => (
              <Pressable key={n} style={styles.social} testID={`social-${n}`}>
                <Ionicons name={n} size={16} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  screen: { flex: 1, backgroundColor: colors.surface },
  hero: { height: 340, backgroundColor: colors.forestDeep },
  heroImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  heroContent: { flex: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, justifyContent: "space-between" },
  heroTag: { fontFamily: fonts.displayItalic, fontSize: 28, color: colors.onImage },
  heroMeta: { fontFamily: fonts.semibold, fontSize: 10, letterSpacing: 2.4, color: colors.brandSecondary, marginTop: 6 },
  form: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 2, color: colors.brandSecondary, marginBottom: 6 },
  h1: { fontFamily: fonts.display, fontSize: 36, color: colors.onSurface },
  sub: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 6, marginBottom: spacing.xl },
  label: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.4, color: colors.onSurfaceTertiary, marginBottom: 8 },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -4 },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, backgroundColor: colors.surface },
  terms: { fontFamily: fonts.body, fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: "center", marginTop: 14 },
  termsLink: { color: colors.brandPrimary, fontFamily: fonts.semibold },
  socialRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginTop: 14 },
  social: { width: 36, height: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
}));
