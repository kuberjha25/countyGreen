import Ionicons from "@react-native-vector-icons/ionicons";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get } from "@/src/api";
import { Badge, ChipRow, EmptyState, ErrorState, Header, Loading, SearchBar, useScreenStyles } from "@/src/components/ui";
import { fmtDate } from "@/src/format";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

const CATS = ["All", "Marketing", "Pricing", "Legal", "Technical"];

// Screen 22 · Documents
export default function Documents() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const docs = useQuery({ queryKey: ["documents"], queryFn: () => get<any[]>("/documents") });
  const list = (docs.data ?? []).filter((d) => (cat === "All" || d.category === cat) && (!q || d.name.toLowerCase().includes(q.toLowerCase())));

  return (
    <View style={s.screen} testID="documents-screen">
      <Header title="Documents" />
      <View style={s.content}>
        <Text style={[s.h2, { fontSize: 30 }]}>County Green Documents</Text>
        <Text style={[s.bodyMuted, { marginBottom: spacing.md }]}>Brochures, plans, pricing and legal documents for partner use.</Text>
        <SearchBar value={q} onChange={setQ} placeholder="Search documents" testID="documents-search" />
      </View>
      <ChipRow options={CATS} value={cat} onChange={setCat} testIDPrefix="doc-cat" />
      {docs.isLoading ? <Loading /> : docs.isError ? <ErrorState message={(docs.error as Error).message} onRetry={docs.refetch} /> : (
        <FlatList
          data={list}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 24, gap: 10 }}
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
                <View style={{ marginTop: 6 }}><Badge label={d.category} tone="gold" small /></View>
              </View>
              <Pressable onPress={() => toast.show(`Downloading ${d.name}`, "success")} style={styles.download} testID={`document-download-${d.id}`}>
                <Ionicons name="download-outline" size={18} color={colors.onBrandSecondary} />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12 },
  icon: { width: 52, height: 60, borderRadius: radius.md, backgroundColor: colors.forestSoft, alignItems: "center", justifyContent: "center", gap: 2 },
  type: { fontFamily: fonts.semibold, fontSize: 9, letterSpacing: 1, color: colors.brandPrimary },
  download: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
}));
