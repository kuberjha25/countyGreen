import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { get, post } from "@/src/api";
import { useCan } from "@/src/auth";
import { BRAND, IMAGES, img, Product } from "@/src/brand";
import { Badge, Button, ConfirmSheet, EmptyState, ErrorState, Loading, useScreenStyles } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

// Screen 20 · Our Products (replaces Inventory) + "Request for Availability" sheet
export default function OurProducts() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const can = useCan();
  const products = useQuery({ queryKey: ["products"], queryFn: () => get<Product[]>("/products") });
  const requests = useQuery({ queryKey: ["availability"], queryFn: () => get<any[]>("/availability"), enabled: can("availability", "view") });
  const [requesting, setRequesting] = useState<Product | null>(null);

  const request = useMutation({
    mutationFn: () => post("/availability", { product_id: requesting?.id }),
    onSuccess: (r: any) => {
      qc.invalidateQueries({ queryKey: ["availability"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      setRequesting(null);
      toast.show(`Request sent — ${r.assigned_to} will confirm availability`, "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });


  return (
    <View style={s.screen} testID="products-screen">
      <View style={styles.hero}>
        <Image source={IMAGES["hero-fountain"]} style={styles.fill} contentFit="cover" />
        <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.fill} />
        <View style={[styles.heroContent, { paddingTop: insets.top + 12 }]}>
          <View style={s.between}>
            <Badge label={BRAND.status.toUpperCase()} tone="gold" small />
            <Pressable onPress={() => router.push("/notifications")} hitSlop={8} testID="products-notifications-button"><Ionicons name="notifications-outline" size={22} color={colors.onImage} /></Pressable>
          </View>
          <View>
            <Text style={styles.heroTitle}>Our Products</Text>
            <Text style={styles.heroSub}>{BRAND.name} · {BRAND.location}</Text>
          </View>
        </View>
      </View>
      {products.isLoading ? <Loading /> : products.isError ? <ErrorState message={(products.error as Error).message} onRetry={products.refetch} /> : (
        <FlatList
          data={products.data ?? []}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 32, gap: 12 }}
          refreshControl={<RefreshControl refreshing={products.isRefetching} onRefresh={() => { products.refetch(); requests.refetch(); }} tintColor={colors.brandPrimary} />}
          ListHeaderComponent={
            <View style={{ gap: 10 }}>
              {can("availability", "view") ? (
                <Pressable onPress={() => router.push("/availability")} style={styles.linkCard} testID="products-requests-link">
                  <View style={styles.linkIcon}><Ionicons name="hourglass-outline" size={18} color={colors.warning} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>Availability requests</Text>
                    <Text style={s.meta}>{requests.data ? `${requests.data.length} request${requests.data.length === 1 ? "" : "s"} with partner & assigned staff` : "With partner & assigned staff"}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              ) : null}
              {can("products", "edit") ? <Button label="Manage products" icon="create-outline" variant="secondary" small onPress={() => router.push("/admin/products")} testID="products-manage-button" /> : null}
            </View>
          }
          ListEmptyComponent={<EmptyState icon="map-outline" title="No products yet" body="Products added by Admin will appear here." />}
          renderItem={({ item: p }) => (
            <View style={styles.card} testID={`product-card-${p.id}`}>
              <View style={styles.cardImgWrap}>
                <Image source={img(p.image)} style={styles.fill} contentFit="cover" />
                <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.fill} />
                <View style={styles.cardImgText}>
                  <Badge label={p.category || "Product"} tone="gold" small />
                  <Text style={styles.cardTitle}>{p.name}</Text>
                </View>
              </View>
              <View style={{ padding: spacing.lg, gap: spacing.md }}>
                {p.description ? <Text style={s.bodyMuted}>{p.description}</Text> : null}
                {can("availability", "add") ? (
                  <Button label="Request for availability" icon="send-outline" variant="gold" small onPress={() => setRequesting(p)} testID={`product-request-${p.id}`} />
                ) : null}
              </View>
            </View>
          )}
        />
      )}

      <ConfirmSheet visible={!!requesting} onClose={() => setRequesting(null)} title="Request for availability" body={`Send an availability request for ${requesting?.name ?? ""} to the County Green team?`} confirmLabel="Send request" onConfirm={() => request.mutate()} loading={request.isPending} testID="availability-request" />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  hero: { height: 190, backgroundColor: colors.forestDeep },
  heroContent: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, justifyContent: "space-between" },
  heroTitle: { fontFamily: fonts.display, fontSize: 32, color: colors.onImage },
  heroSub: { fontFamily: fonts.body, fontSize: 13, color: colors.onImageMuted, marginTop: 2 },
  linkCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  linkIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.goldSoft, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  cardImgWrap: { height: 150, backgroundColor: colors.forestDeep },
  cardImgText: { flex: 1, justifyContent: "flex-end", padding: spacing.lg, gap: 6 },
  cardTitle: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, color: colors.onImage },
}));
