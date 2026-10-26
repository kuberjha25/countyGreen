import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { errorMessage } from "@/src/api";
import { Button, Field, Header, ScreenTitle, useScreenStyles } from "@/src/components/ui";
import { resendRegistrantOtp, verifyRegistrantOtp } from "@/src/store/registrationsSlice";
import { useRun } from "@/src/store/useRun";
import { spacing } from "@/src/theme";
import { useToast } from "@/src/toast";

// Verify the newly registered partner's mobile (POST /api/admin/registrations/verify-otp, resend-otp).
export default function VerifyRegistrant() {
  const { mobile = "" } = useLocalSearchParams<{ mobile: string }>();
  const s = useScreenStyles();
  const router = useRouter();
  const toast = useToast();
  const [otp, setOtp] = useState("");
  const [err, setErr] = useState<string | undefined>();
  const [verify, verifying] = useRun();
  const [resend, resending] = useRun();

  const submit = async () => {
    if (!/^\d{4,6}$/.test(otp)) return setErr("Enter the code sent to the partner");
    setErr(undefined);
    try {
      await verify(verifyRegistrantOtp({ mobile, otp }));
      toast.show("Partner mobile verified", "success");
      router.replace("/registrations");
    } catch (e) {
      setErr(errorMessage(e));
    }
  };

  return (
    <View style={s.screen} testID="registrant-otp-screen">
      <Header title="Verify Partner Mobile" showBell={false} />
      <View style={[s.content, { paddingTop: 8 }]}>
        <ScreenTitle eyebrow="VERIFICATION" title="Verify OTP" subtitle={`Ask the partner for the code sent to +91 ${mobile}.`} />
        <Field label="OTP" placeholder="6-digit code" value={otp} onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6} error={err} testID="registrant-otp-input" />
        <Button label="Verify" icon="checkmark" variant="gold" onPress={submit} loading={verifying} testID="registrant-otp-verify" />
        <Button
          label="Resend OTP"
          variant="ghost"
          small
          loading={resending}
          onPress={() => resend(resendRegistrantOtp(mobile)).then(() => toast.show("A new code has been sent", "success")).catch((e) => toast.show(errorMessage(e), "error"))}
          style={{ marginTop: spacing.md }}
          testID="registrant-otp-resend"
        />
        <Text style={[s.caption, { marginTop: spacing.lg, textAlign: "center" }]}>The registration is saved; you can verify the mobile later from the partner desk.</Text>
      </View>
    </View>
  );
}
