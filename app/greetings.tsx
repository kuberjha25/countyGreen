import { useMutation } from "@tanstack/react-query";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { GREETING_TEMPLATES, Occasion, OCCASIONS } from "@/src/brand";
import { PartnerChooser, resolveWaNumber, sendOnWhatsApp, WhatsAppNumber } from "@/src/components/partners";
import { BottomNav, Button, Field, Header, ScreenTitle, Segmented, useScreenStyles } from "@/src/components/ui";
import { Partner } from "@/src/lookups";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

const fill = (t: string, p?: Partner | null) => t.replace(/\{name\}/g, p?.name.split(" ")[0] ?? "Partner");

// Birthday / Anniversary greetings to CP / Broker / Influencer / Freelancer over WhatsApp:
// 1 select user → 2 registered or another WhatsApp number → 3 select greeting → 4 send.
export default function Greetings() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [number, setNumber] = useState<{ mode: "registered" | "other"; other: string }>({ mode: "registered", other: "" });
  const [kind, setKind] = useState<Occasion>("Birthday");
  const [template, setTemplate] = useState(0);
  const [message, setMessage] = useState(fill(GREETING_TEMPLATES.Birthday[0]));

  const pick = (occ: Occasion, i: number, p = partner) => {
    setKind(occ);
    setTemplate(i);
    setMessage(fill(GREETING_TEMPLATES[occ][i], p));
  };

  const send = useMutation({
    mutationFn: () => {
      if (!partner) throw new Error("Select the user");
      return sendOnWhatsApp({ kind: "greeting", occasion: kind, to_id: partner.id, to_name: partner.name, to_number: resolveWaNumber(partner, number), message });
    },
    onSuccess: () => toast.show("Opening WhatsApp…", "success"),
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  return (
    <View style={s.screen} testID="greetings-screen">
      <Header title="Greetings" />
      <KeyboardAwareScrollView bottomOffset={40} contentContainerStyle={[s.content, { paddingTop: 8, paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
        <ScreenTitle title="Birthday & Anniversary" subtitle="Send greetings to CPs, brokers, influencers and freelancers on WhatsApp." />
        <PartnerChooser value={partner?.id ?? null} onChange={(p) => { setPartner(p); setMessage(fill(GREETING_TEMPLATES[kind][template], p)); }} label="1 · Select user" testID="greeting-partner" />
        <WhatsAppNumber partner={partner} value={number} onChange={setNumber} label="2 · Send to WhatsApp number" testID="greeting-number" />
        <Text style={styles.label}>3 · SELECT GREETING</Text>
        <View style={{ marginBottom: spacing.md }}><Segmented options={OCCASIONS} value={kind} onChange={(o) => pick(o, 0)} testIDPrefix="greeting-kind" /></View>
        {GREETING_TEMPLATES[kind].map((t, i) => (
          <Pressable key={i} onPress={() => pick(kind, i)} style={[styles.template, template === i && styles.templateSel]} testID={`greeting-template-${i}`}>
            <Ionicons name={template === i ? "radio-button-on" : "radio-button-off"} size={18} color={template === i ? colors.brandPrimary : colors.muted} />
            <Text style={[s.bodyMuted, { flex: 1, fontSize: 13 }]}>{fill(t, partner)}</Text>
          </Pressable>
        ))}
        <Field label="Message" value={message} onChangeText={setMessage} multiline containerStyle={{ marginTop: spacing.md }} testID="greeting-message" />
        <Button label="4 · Send on WhatsApp" icon="logo-whatsapp" variant="gold" onPress={() => send.mutate()} loading={send.isPending} testID="greeting-send" />
      </KeyboardAwareScrollView>
      <BottomNav />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  label: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.4, color: colors.onSurfaceTertiary, marginBottom: 8 },
  template: { flexDirection: "row", gap: 10, padding: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 8, backgroundColor: colors.surfaceSecondary },
  templateSel: { borderColor: colors.brandPrimary, backgroundColor: colors.forestSoft },
}));
