import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";

import { get, post } from "@/src/api";
import { isStaff } from "@/src/access";
import { useAuth, useCan } from "@/src/auth";
import { PartnerChooser, resolveWaNumber, sendOnWhatsApp, WhatsAppNumber } from "@/src/components/partners";
import { Badge, BottomNav, BottomSheet, Button, ChipRow, ChoiceChips, EmptyState, ErrorState, Field, Header, Loading, SearchBar, useScreenStyles } from "@/src/components/ui";
import { fmtDate } from "@/src/format";
import { Partner } from "@/src/lookups";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

const CATS = ["All", "Marketing", "Pricing", "Legal", "Technical"];
const shareText = (d: any, p?: Partner | null) =>
  `Hello${p ? ` ${p.name.split(" ")[0]}` : ""}, sharing the County Green "${d.name}" with you.${d.url ? `\n${d.url}` : ""}\n— Team County Green, New Chandigarh`;

// Screen 22 · Documents — download, upload (Admin / CRM) and share on WhatsApp:
// select document → select user → registered or another WhatsApp number → send.
export default function Documents() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const can = useCan();
  const { user } = useAuth();
  const canShare = isStaff(user) && can("documents", "view");
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const docs = useQuery({ queryKey: ["documents"], queryFn: () => get<any[]>("/documents") });
  const list = (docs.data ?? []).filter((d) => (cat === "All" || d.category === cat) && (!q || d.name.toLowerCase().includes(q.toLowerCase())));

  // WhatsApp share
  const [sharing, setSharing] = useState<any>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [number, setNumber] = useState<{ mode: "registered" | "other"; other: string }>({ mode: "registered", other: "" });
  const [message, setMessage] = useState("");
  // Upload
  const [uploading, setUploading] = useState(false);
  const [up, setUp] = useState({ name: "", category: "Marketing", file: "" });

  const openShare = (d: any) => {
    setPartner(null);
    setNumber({ mode: "registered", other: "" });
    setMessage(shareText(d));
    setSharing(d);
  };

  const share = useMutation({
    mutationFn: () => {
      const to = resolveWaNumber(partner, number);
      if (!partner && number.mode === "registered") throw new Error("Select a user or enter another WhatsApp number");
      return sendOnWhatsApp({ kind: "document", document: sharing.name, to_id: partner?.id, to_name: partner?.name ?? "WhatsApp contact", to_number: to, message });
    },
    onSuccess: () => {
      setSharing(null);
      toast.show("Opening WhatsApp…", "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });

  const upload = useMutation({
    mutationFn: () => {
      if (!up.name.trim()) throw new Error("Enter the document name");
      if (!up.file) throw new Error("Attach the file");
      return post("/documents", { name: up.name.trim(), category: up.category, type: "PDF", size: "—", file_name: up.file });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setUploading(false);
      toast.show("Document added", "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });


  return (
    <View style={s.screen} testID="documents-screen">
      <Header title="Documents" right={can("documents", "add") ? <Pressable onPress={() => { setUp({ name: "", category: "Marketing", file: "" }); setUploading(true); }} style={styles.addBtn} testID="documents-add-button"><Ionicons name="add" size={22} color={colors.onBrandSecondary} /></Pressable> : undefined} />
      <View style={s.content}>
        <Text style={[s.h2, { fontSize: 30 }]}>County Green Documents</Text>
        <Text style={[s.bodyMuted, { marginBottom: spacing.md }]}>Brochures, plans, pricing and legal documents{canShare ? " — share any of them on WhatsApp." : " for partner use."}</Text>
        <SearchBar value={q} onChange={setQ} placeholder="Search documents" testID="documents-search" />
      </View>
      <ChipRow options={CATS} value={cat} onChange={setCat} testIDPrefix="doc-cat" />
      {docs.isLoading ? <Loading /> : docs.isError ? <ErrorState message={(docs.error as Error).message} onRetry={docs.refetch} /> : (
        <FlatList
          data={list}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 24, gap: 10 }}
          refreshControl={<RefreshControl refreshing={docs.isRefetching} onRefresh={docs.refetch} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={<EmptyState icon="document-text-outline" title="No documents found" body="Try another category or search term." />}
          renderItem={({ item: d }) => (
            <Pressable onPress={() => toast.show(`Opening ${d.name}`, "info")} style={({ pressed }) => [styles.row, pressed && { opacity: 0.9 }]} testID={`document-${d.id}`}>
              <View style={styles.icon}>
                <Ionicons name={d.type === "ZIP" ? "archive-outline" : "document-text-outline"} size={20} color={colors.brandPrimary} />
                <Text style={styles.type}>{d.type}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={2}>{d.name}</Text>
                <Text style={s.meta}>{d.size} · Updated {fmtDate(d.updated_at)}</Text>
                <View style={[s.row, { marginTop: 6, gap: 10 }]}>
                  <Badge label={d.category} tone="gold" small />
                </View>
              </View>
              <View style={{ gap: 8 }}>
                {canShare ? (
                  <Pressable onPress={() => openShare(d)} style={[styles.round, { backgroundColor: colors.success }]} testID={`document-share-${d.id}`}>
                    <Ionicons name="logo-whatsapp" size={18} color={colors.onSuccess} />
                  </Pressable>
                ) : null}
                <Pressable onPress={() => toast.show(`Downloading ${d.name}`, "success")} style={styles.round} testID={`document-download-${d.id}`}>
                  <Ionicons name="download-outline" size={18} color={colors.onBrandSecondary} />
                </Pressable>
              </View>
            </Pressable>
          )}
        />
      )}

      <BottomSheet visible={!!sharing} onClose={() => setSharing(null)} title="Share on WhatsApp" subtitle={sharing?.name} testID="document-share-sheet">
        <PartnerChooser value={partner?.id ?? null} onChange={(p) => { setPartner(p); if (sharing) setMessage(shareText(sharing, p)); }} label="Select user" testID="document-share-partner" />
        <WhatsAppNumber partner={partner} value={number} onChange={setNumber} testID="document-share-number" />
        <Field label="Message" value={message} onChangeText={setMessage} multiline testID="document-share-message" />
        <Button label="Send on WhatsApp" icon="logo-whatsapp" variant="gold" onPress={() => share.mutate()} loading={share.isPending} testID="document-share-send" />
      </BottomSheet>

      <BottomSheet visible={uploading} onClose={() => setUploading(false)} title="Add document" testID="document-upload-sheet">
        <Field label="Document name" placeholder="e.g. Phase 1 Price List" value={up.name} onChangeText={(name) => setUp((x) => ({ ...x, name }))} testID="document-name-input" />
        <ChoiceChips label="Category" value={up.category} options={CATS.slice(1)} onChange={(category) => setUp((x) => ({ ...x, category }))} testID="document-category" />
        <Pressable onPress={() => { setUp((x) => ({ ...x, file: `${(x.name || "document").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf` })); toast.show("File attached", "success"); }} style={styles.attach} testID="document-attach">
          <Ionicons name={up.file ? "document-text" : "cloud-upload-outline"} size={20} color={colors.brandPrimary} />
          <Text style={[s.name, { flex: 1 }]}>{up.file || "Attach file (PDF / image)"}</Text>
          <Text style={s.link}>{up.file ? "Replace" : "Upload"}</Text>
        </Pressable>
        <Button label="Add document" icon="checkmark" variant="gold" onPress={() => upload.mutate()} loading={upload.isPending} testID="document-upload-submit" />
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
  attach: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: radius.md, borderWidth: 1, borderStyle: "dashed", borderColor: colors.brandPrimary, marginBottom: spacing.lg },
}));
