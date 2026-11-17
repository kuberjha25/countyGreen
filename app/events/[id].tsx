import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";

import { errorMessage } from "@/src/api";
import { imageSource } from "@/src/brand";
import { LinkifiedText } from "@/src/components/linkified";
import { Badge, BottomNav, Button, Card, ErrorState, Header, Loading, SectionLabel, useScreenStyles } from "@/src/components/ui";
import { eventWhen, plainText } from "@/src/format";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchPromotion, rsvpEvent } from "@/src/store/contentSlice";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";
import { RSVP_LABEL, RsvpStatus } from "@/src/types";

const CHOICES: { v: RsvpStatus; icon: "checkmark-circle-outline" | "help-circle-outline" | "close-circle-outline" }[] = [
  { v: "attending", icon: "checkmark-circle-outline" },
  { v: "maybe", icon: "help-circle-outline" },
  { v: "not_attending", icon: "close-circle-outline" },
];

// Event detail (GET /api/promotions/{id}) + RSVP (POST /api/promotions/{id}/rsvp — attending | maybe | not_attending).
export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const entry = useAppSelector((st) => st.content.promotionById[Number(id)]);
  const e = entry?.data;
  const [sending, setSending] = useState<RsvpStatus | null>(null);

  useEffect(() => {
    if (!entry) dispatch(fetchPromotion(Number(id)));
  }, [dispatch, id, entry]);

  const rsvp = async (status: RsvpStatus) => {
    setSending(status);
    try {
      const r = await dispatch(rsvpEvent({ id: Number(id), status })).unwrap();
      toast.show(r.message || "Your RSVP has been recorded", "success");
    } catch (err) {
      toast.show(errorMessage(err), "error");
    } finally {
      setSending(null);
    }
  };

  const terms = (e?.terms ?? "").split(/\r?\n/).map((t) => t.trim()).filter(Boolean);

  return (
    <View style={s.screen} testID="event-detail-screen">
      <Header title="Event" />
      {!e ? (
        entry?.status === "failed" ? <ErrorState message={entry.error ?? "Event not found"} onRetry={() => dispatch(fetchPromotion(Number(id)))} /> : <Loading />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
          {e.image_url ? <Image source={imageSource(e.image_url)} style={styles.hero} contentFit="cover" /> : null}
          <View style={s.content}>
            {e.tag_name ? <View style={{ alignSelf: "flex-start", marginBottom: 8 }}><Badge label={e.tag_name} tone="gold" small /></View> : null}
            <Text style={styles.title} testID="event-title">{e.title}</Text>
            {eventWhen(e) ? <View style={[s.row, { gap: 6, marginTop: 8 }]}><Ionicons name="calendar-outline" size={16} color={colors.muted} /><Text style={s.meta}>{eventWhen(e)}{e.start_time ? ` · ${e.start_time.slice(0, 5)}` : ""}</Text></View> : null}
            {e.project?.name ? <Text style={[s.meta, { marginTop: 4 }]}>{e.project.name}</Text> : null}

            {e.promotion_type === "event" ? (
              <>
                <SectionLabel style={{ marginTop: spacing.xl }}>Will you attend?</SectionLabel>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {CHOICES.map((c) => {
                    const sel = e.rsvp_status === c.v;
                    return (
                      <Pressable key={c.v} onPress={() => rsvp(c.v)} disabled={!!sending} style={[styles.choice, sel && styles.choiceSel, sending === c.v && { opacity: 0.6 }]} testID={`rsvp-${c.v}`}>
                        <Ionicons name={c.icon} size={20} color={sel ? colors.onBrandPrimary : colors.brandPrimary} />
                        <Text style={[styles.choiceText, sel && { color: colors.onBrandPrimary }]}>{RSVP_LABEL[c.v]}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={[s.caption, { marginTop: 8 }]}>{e.rsvp_status ? `Your response: ${RSVP_LABEL[e.rsvp_status]}. You can change it any time.` : "Tap an option to respond."}</Text>
              </>
            ) : null}

            {e.short_description ? <Text style={[s.body, { marginTop: spacing.xl, fontFamily: fonts.medium }]}>{e.short_description}</Text> : null}
            {plainText(e.description, { keepLinks: true }).split(/\n\s*\n/).filter(Boolean).map((p, i) => <LinkifiedText key={i} style={[s.body, { marginTop: spacing.md }]}>{p}</LinkifiedText>)}

            {(e.benefits ?? []).length ? (
              <>
                <SectionLabel style={{ marginTop: spacing.xl }}>Highlights</SectionLabel>
                <Card>
                  {(e.benefits ?? []).map((b, i) => (
                    <View key={i} style={{ marginBottom: 10 }}>
                      <Text style={s.name}>{b.title}</Text>
                      {b.description ? <Text style={s.bodyMuted}>{b.description}</Text> : null}
                    </View>
                  ))}
                </Card>
              </>
            ) : null}
            {terms.length ? (
              <>
                <SectionLabel style={{ marginTop: spacing.xl }}>Terms</SectionLabel>
                {terms.map((t, i) => <Text key={i} style={[s.bodyMuted, { marginBottom: 4 }]}>• {t}</Text>)}
              </>
            ) : null}
            {e.brochure_url ? <Button label="View brochure" icon="document-outline" variant="secondary" onPress={() => Linking.openURL(e.brochure_url!)} style={{ marginTop: spacing.xl }} testID="event-brochure" /> : null}
          </View>
        </ScrollView>
      )}
      <BottomNav />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  hero: { height: 220, backgroundColor: colors.forestSoft },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.onSurface, marginTop: spacing.md },
  choice: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1, borderColor: colors.brandPrimary, backgroundColor: colors.surface },
  choiceSel: { backgroundColor: colors.brandPrimary },
  choiceText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.brandPrimary },
}));
