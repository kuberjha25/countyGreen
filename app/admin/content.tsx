import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

import { del, get, patch, post, put } from "@/src/api";
import { useCan } from "@/src/auth";
import { IMAGES, img } from "@/src/brand";
import { Badge, BottomNav, BottomSheet, Button, ChoiceChips, ConfirmSheet, ErrorState, Field, Header, Loading, SectionLabel, Segmented, useScreenStyles } from "@/src/components/ui";
import { fmtDate } from "@/src/format";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

const TABS = ["About", "Terms", "News"] as const;
const NEWS_CATS = ["Project Updates", "Announcements", "Marketing", "Events"];

// Admin · Content Management (CMS) — About us, Terms & Conditions and News posts shown in the app.
export default function ContentAdmin() {
  const s = useScreenStyles();
  const [tab, setTab] = useState<(typeof TABS)[number]>("About");
  return (
    <View style={s.screen} testID="content-admin-screen">
      <Header title="Content Management" />
      <View style={[s.content, { paddingBottom: spacing.sm }]}>
        <Segmented options={TABS} value={tab} onChange={setTab} testIDPrefix="cms-tab" />
      </View>
      {tab === "About" ? <AboutEditor /> : tab === "Terms" ? <TermsEditor /> : <NewsEditor />}
      <BottomNav active="profile" />
    </View>
  );
}

function useSave(key: string) {
  const toast = useToast();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: object) => put(`/content/${key}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["content", key] });
      toast.show("Published to the app", "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });
}

function AboutEditor() {
  const s = useScreenStyles();
  const can = useCan();
  const about = useQuery({ queryKey: ["content", "about"], queryFn: () => get("/content/about") });
  // Unsaved edits; until the first change the published content is shown.
  const [draft, setDraft] = useState<any>(null);
  const f = draft ?? (about.data ? { ...about.data, highlights_text: (about.data.highlights ?? []).join("\n") } : null);
  const setF = (fn: (x: any) => any) => setDraft(fn(f));
  const save = useSave("about");
  if (about.isError) return <ErrorState message={(about.error as Error).message} onRetry={about.refetch} />;
  if (!f) return <Loading />;
  const set = (k: string) => (v: string) => setF((x: any) => ({ ...x, [k]: v }));
  const editable = can("content", "edit");
  return (
    <KeyboardAwareScrollView bottomOffset={40} contentContainerStyle={[s.content, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
      <Field label="Title" value={f.title} onChangeText={set("title")} editable={editable} testID="cms-about-title" />
      <Field label="Subtitle" value={f.subtitle} onChangeText={set("subtitle")} editable={editable} testID="cms-about-subtitle" />
      <Field label="Our story" value={f.story} onChangeText={set("story")} multiline editable={editable} testID="cms-about-story" />
      <SectionLabel>What we stand for</SectionLabel>
      {(f.pillars ?? []).map((p: any, i: number) => (
        <View key={i}>
          <Field label={`Pillar ${i + 1} title`} value={p.title} onChangeText={(v) => setF((x: any) => ({ ...x, pillars: x.pillars.map((y: any, j: number) => (j === i ? { ...y, title: v } : y)) }))} editable={editable} testID={`cms-pillar-title-${i}`} />
          <Field label={`Pillar ${i + 1} text`} value={p.body} onChangeText={(v) => setF((x: any) => ({ ...x, pillars: x.pillars.map((y: any, j: number) => (j === i ? { ...y, body: v } : y)) }))} multiline editable={editable} testID={`cms-pillar-body-${i}`} />
        </View>
      ))}
      <Field label="Key highlights (one per line)" value={f.highlights_text} onChangeText={set("highlights_text")} multiline editable={editable} testID="cms-about-highlights" />
      <Field label="Company note" value={f.company_note} onChangeText={set("company_note")} multiline editable={editable} testID="cms-about-note" />
      {editable ? (
        <Button
          label="Publish"
          icon="cloud-upload-outline"
          variant="gold"
          onPress={() => {
            const { highlights_text, ...rest } = f;
            save.mutate({ ...rest, highlights: String(highlights_text).split("\n").map((x) => x.trim()).filter(Boolean) });
          }}
          loading={save.isPending}
          testID="cms-about-save"
        />
      ) : null}
    </KeyboardAwareScrollView>
  );
}

function TermsEditor() {
  const s = useScreenStyles();
  const { colors } = useTheme();
  const can = useCan();
  const terms = useQuery({ queryKey: ["content", "terms"], queryFn: () => get("/content/terms") });
  type Section = { title: string; body: string };
  // Unsaved edits; until the first change the published terms are shown.
  const [draft, setDraft] = useState<Section[] | null>(null);
  const sections: Section[] | null = draft ?? (terms.data ? terms.data.sections ?? [] : null);
  const setSections = (fn: (x: Section[] | null) => Section[]) => setDraft(fn(sections));
  const save = useSave("terms");
  if (terms.isError) return <ErrorState message={(terms.error as Error).message} onRetry={terms.refetch} />;
  if (!sections) return <Loading />;
  const editable = can("content", "edit");
  const update = (i: number, k: "title" | "body", v: string) => setSections((x) => x!.map((y, j) => (j === i ? { ...y, [k]: v } : y)));
  return (
    <KeyboardAwareScrollView bottomOffset={40} contentContainerStyle={[s.content, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
      <Text style={[s.caption, { marginBottom: spacing.md }]}>Last updated {terms.data?.updated}. Publishing sets the date to today.</Text>
      {sections.map((sec, i) => (
        <View key={i} style={{ marginBottom: spacing.sm }}>
          <View style={[s.between, { marginBottom: 6 }]}>
            <Text style={s.name}>Section {i + 1}</Text>
            {can("content", "delete") ? <Pressable onPress={() => setSections((x) => x!.filter((_, j) => j !== i))} hitSlop={8} testID={`cms-terms-delete-${i}`}><Ionicons name="trash-outline" size={17} color={colors.error} /></Pressable> : null}
          </View>
          <Field placeholder="Heading" value={sec.title} onChangeText={(v) => update(i, "title", v)} editable={editable} testID={`cms-terms-title-${i}`} />
          <Field placeholder="Text" value={sec.body} onChangeText={(v) => update(i, "body", v)} multiline editable={editable} testID={`cms-terms-body-${i}`} />
        </View>
      ))}
      {can("content", "add") ? <Button label="Add section" icon="add" variant="secondary" small onPress={() => setSections((x) => [...x!, { title: `${x!.length + 1}. `, body: "" }])} style={{ marginBottom: spacing.lg }} testID="cms-terms-add" /> : null}
      {editable ? <Button label="Publish" icon="cloud-upload-outline" variant="gold" onPress={() => save.mutate({ sections: sections.filter((x) => x.title.trim() || x.body.trim()) })} loading={save.isPending} testID="cms-terms-save" /> : null}
    </KeyboardAwareScrollView>
  );
}

const EMPTY_POST = { title: "", category: "Announcements", image: "hero-security", body: "" };

function NewsEditor() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const can = useCan();
  const news = useQuery({ queryKey: ["news"], queryFn: () => get<any[]>("/news") });
  const [form, setForm] = useState<typeof EMPTY_POST & { id?: string }>(EMPTY_POST);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<any>(null);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["news"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const save = useMutation({
    mutationFn: () => (form.id ? patch(`/news/${form.id}`, form) : post("/news", form)),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast.show(form.id ? "Post updated" : "Post published", "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });
  const remove = useMutation({
    mutationFn: () => del(`/news/${deleting?.id}`),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
      toast.show("Post deleted", "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });
  if (news.isLoading) return <Loading />;
  return (
    <>
      <ScrollView contentContainerStyle={[s.content, { paddingBottom: 40, gap: 10 }]}>
        {can("content", "add") ? <Button label="New post" icon="add" variant="secondary" small onPress={() => { setForm(EMPTY_POST); setOpen(true); }} testID="cms-news-add" /> : null}
        {(news.data ?? []).map((n) => (
          <View key={n.id} style={styles.card} testID={`cms-news-${n.id}`}>
            <Image source={img(n.image)} style={styles.thumb} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={s.name} numberOfLines={2}>{n.title}</Text>
              <View style={[s.row, { gap: 6, marginTop: 4 }]}><Badge label={n.category} tone="gold" small /><Text style={s.caption}>{fmtDate(n.published_at)}</Text></View>
            </View>
            <View style={{ gap: 14 }}>
              {can("content", "edit") ? <Pressable onPress={() => { setForm({ id: n.id, title: n.title, category: n.category, image: n.image, body: n.body }); setOpen(true); }} hitSlop={6} testID={`cms-news-edit-${n.id}`}><Ionicons name="pencil-outline" size={18} color={colors.brandPrimary} /></Pressable> : null}
              {can("content", "delete") ? <Pressable onPress={() => setDeleting(n)} hitSlop={6} testID={`cms-news-delete-${n.id}`}><Ionicons name="trash-outline" size={18} color={colors.error} /></Pressable> : null}
            </View>
          </View>
        ))}
      </ScrollView>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={form.id ? "Edit post" : "New post"} testID="cms-news-sheet">
        <Field label="Title" value={form.title} onChangeText={(title) => setForm((x) => ({ ...x, title }))} testID="cms-news-title" />
        <ChoiceChips label="Category" value={form.category} options={NEWS_CATS} onChange={(category) => setForm((x) => ({ ...x, category }))} testID="cms-news-category" />
        <Text style={styles.label}>IMAGE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: spacing.lg }}>
          {Object.keys(IMAGES).map((k) => (
            <Pressable key={k} onPress={() => setForm((x) => ({ ...x, image: k }))} style={[styles.pick, form.image === k && styles.pickSel]} testID={`cms-news-image-${k}`}>
              <Image source={IMAGES[k]} style={{ width: 64, height: 48, borderRadius: radius.sm }} contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>
        <Field label="Story" value={form.body} onChangeText={(body) => setForm((x) => ({ ...x, body }))} multiline testID="cms-news-body" />
        <Button label={form.id ? "Save post" : "Publish post"} icon="checkmark" variant="gold" onPress={() => save.mutate()} loading={save.isPending} testID="cms-news-save" />
      </BottomSheet>
      <ConfirmSheet visible={!!deleting} onClose={() => setDeleting(null)} title="Delete post?" body={`"${deleting?.title ?? ""}" will be removed from the News Feed.`} confirmLabel="Delete" danger onConfirm={() => remove.mutate()} loading={remove.isPending} testID="cms-news-delete" />
    </>
  );
}

const useStyles = makeStyles((colors) => ({
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  thumb: { width: 60, height: 60, borderRadius: radius.md },
  label: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.4, color: colors.onSurfaceTertiary, marginBottom: 8 },
  pick: { padding: 2, borderRadius: radius.sm + 2, borderWidth: 2, borderColor: "transparent" },
  pickSel: { borderColor: colors.brandPrimary },
}));
