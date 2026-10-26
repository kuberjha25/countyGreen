import Ionicons from "@react-native-vector-icons/ionicons";
import { useEffect, useState } from "react";
import { FlatList, Linking, Pressable, RefreshControl, Text, View } from "react-native";

import { errorMessage } from "@/src/api";
import { isStaff } from "@/src/access";
import { useAuth } from "@/src/auth";
import { openWhatsApp, ReferenceChooser, WhatsAppNumber } from "@/src/components/partners";
import { Badge, BottomNav, BottomSheet, Button, ChipRow, COMING_SOON, EmptyState, ErrorState, Field, Header, Loading, SearchBar, useScreenStyles } from "@/src/components/ui";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchDocuments } from "@/src/store/contentSlice";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";
import type { DocumentItem, Reference } from "@/src/types";

const ALL = "All";
const shareText = (d: DocumentItem, r?: Reference | null) => `Hello${r ? ` ${r.name.split(" ")[0]}` : ""}, sharing the County Green "${d.title}" with you:\n${d.file_url}\n— Team County Green, New Chandigarh`;

// Screen 22 · Documents (GET /api/documents). Staff share a document on WhatsApp:
// select document → select user → registered or another WhatsApp number → send.
export default function Documents() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const canShare = isStaff(user);
  const docs = useAppSelector((st) => st.content.documents);
  const [cat, setCat] = useState(ALL);
  const [q, setQ] = useState("");
  const [sharing, setSharing] = useState<DocumentItem | null>(null);
  const [to, setTo] = useState<Reference | null>(null);
  const [number, setNumber] = useState<{ mode: "registered" | "other"; other: string }>({ mode: "registered", other: "" });
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (docs.status === "idle") dispatch(fetchDocuments());
  }, [dispatch, docs.status]);

  const all = docs.data ?? [];
  const cats = [ALL, ...new Set(all.map((d) => d.category).filter(Boolean))];
  const list = all.filter((d) => (cat === ALL || d.category === cat) && (!q || `${d.title} ${d.project_name ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  const openShare = (d: DocumentItem) => {
    setTo(null);
    setNumber({ mode: "registered", other: "" });
    setMessage(shareText(d));
    setSharing(d);
  };
  const send = async () => {
    try {
      if (number.mode === "registered" && !to) throw new Error("Select a user or enter another WhatsApp number");
      await openWhatsApp(number.mode === "registered" ? to?.mobile ?? "" : number.other, message);
      setSharing(null);
    } catch (e) {
      toast.show(errorMessage(e), "error");
    }
  };

  return (
    <View style={s.screen} testID="documents-screen">
      <Header title="Documents" right={canShare ? <Pressable onPress={() => toast.show(COMING_SOON, "info")} style={styles.addBtn} testID="documents-add-button"><Ionicons name="add" size={22} color={colors.onBrandSecondary} /></Pressable> : undefined} />
      <View style={s.content}>
        <Text style={[s.h2, { fontSize: 30 }]}>County Green Documents</Text>
        <Text style={[s.bodyMuted, { marginBottom: spacing.md }]}>Brochures, plans, pricing and legal documents{canShare ? " — share any of them on WhatsApp." : " for partner use."}</Text>
        <SearchBar value={q} onChange={setQ} placeholder="Search documents" testID="documents-search" />
      </View>
      <ChipRow options={cats} value={cat} onChange={setCat} testIDPrefix="doc-cat" />
      {docs.status === "loading" && !docs.data ? <Loading /> : docs.status === "failed" && !docs.data ? <ErrorState message={docs.error ?? "Could not load documents"} onRetry={() => dispatch(fetchDocuments())} /> : (
        <FlatList
          data={list}
          keyExtractor={(d) => String(d.id)}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 24, gap: 10 }}
          refreshControl={<RefreshControl refreshing={docs.status === "loading"} onRefresh={() => dispatch(fetchDocuments())} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={<EmptyState icon="document-text-outline" title="No documents found" body="Try another category or search term." />}
          renderItem={({ item: d }) => (
            <Pressable onPress={() => Linking.openURL(d.file_url)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]} testID={`document-${d.id}`}>
              <View style={styles.icon}>
                <Ionicons name={/zip/i.test(d.file_extension) ? "archive-outline" : "document-text-outline"} size={20} color={colors.brandPrimary} />
                <Text style={styles.type}>{d.file_extension}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={2}>{d.title}</Text>
                <Text style={s.meta}>{[d.file_size, d.project_name].filter(Boolean).join(" · ")}</Text>
                <View style={{ marginTop: 6 }}><Badge label={d.category} tone="gold" small /></View>
              </View>
              <View style={{ gap: 8 }}>
                {canShare ? (
                  <Pressable onPress={() => openShare(d)} style={[styles.round, { backgroundColor: colors.success }]} testID={`document-share-${d.id}`}>
                    <Ionicons name="logo-whatsapp" size={18} color={colors.onSuccess} />
                  </Pressable>
                ) : null}
                <Pressable onPress={() => Linking.openURL(d.file_url)} style={styles.round} testID={`document-download-${d.id}`}>
                  <Ionicons name="download-outline" size={18} color={colors.onBrandSecondary} />
                </Pressable>
              </View>
            </Pressable>
          )}
        />
      )}

      <BottomSheet visible={!!sharing} onClose={() => setSharing(null)} title="Share on WhatsApp" subtitle={sharing?.title} testID="document-share-sheet">
        <ReferenceChooser value={to} onChange={(r) => { setTo(r); if (sharing) setMessage(shareText(sharing, r)); }} label="Select user" testID="document-share-user" />
        <WhatsAppNumber registered={to?.mobile} value={number} onChange={setNumber} testID="document-share-number" />
        <Field label="Message" value={message} onChangeText={setMessage} multiline testID="document-share-message" />
        <Button label="Send on WhatsApp" icon="logo-whatsapp" variant="gold" onPress={send} testID="document-share-send" />
      </BottomSheet>
      <BottomNav />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12 },
  icon: { width: 52, height: 60, borderRadius: radius.md, backgroundColor: colors.forestSoft, alignItems: "center", justifyContent: "center", gap: 2 },
  type: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1, color: colors.brandPrimary },
  round: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
}));
