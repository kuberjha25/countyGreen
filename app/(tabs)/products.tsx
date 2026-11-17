import Ionicons from "@react-native-vector-icons/ionicons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { errorMessage } from "@/src/api";
import { BRAND, IMAGES } from "@/src/brand";
import { Badge, BottomSheet, Button, EmptyState, ErrorState, Loading, useScreenStyles } from "@/src/components/ui";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchProductUnits, fetchProducts, Product, requestAvailability } from "@/src/store/catalogSlice";
import type { Entry } from "@/src/store/list";
import type { InventoryUnit } from "@/src/types";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

// Screen 20 · Our Products (replaces Inventory) — the inventory categories configured on the
// County Green server (e.g. 500 Sq. Yards), per project. "Request for Availability" lists the
// product's units (GET /api/inventory) and records a request for one (POST /api/inventory-request).
export default function OurProducts() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const products = useAppSelector((st) => st.catalog.products);

  useEffect(() => {
    if (products.status === "idle") dispatch(fetchProducts());
  }, [dispatch, products.status]);

  const [open, setOpen] = useState<Product | null>(null);
  const [units, setUnits] = useState<Entry<InventoryUnit[]>>({ status: "idle" });
  const [requested, setRequested] = useState<number[]>([]);
  const [sending, setSending] = useState<number | null>(null);

  const openUnits = async (p: Product) => {
    setOpen(p);
    setUnits({ status: "loading" });
    try {
      setUnits({ status: "succeeded", data: await dispatch(fetchProductUnits(p)).unwrap() });
    } catch (e) {
      setUnits({ status: "failed", error: errorMessage(e) });
    }
  };

  const request = async (id: number) => {
    setSending(id);
    try {
      const r = await dispatch(requestAvailability(id)).unwrap();
      setRequested((x) => [...x, id]);
      toast.show(r?.message || "Your request has been recorded", "success");
    } catch (e) {
      toast.show(errorMessage(e), "error");
    } finally {
      setSending(null);
    }
  };

  return (
    <View style={s.screen} testID="products-screen">
      <View style={styles.hero}>
        <Image source={IMAGES["hero-fountain"]} style={styles.fill} contentFit="cover" />
        <LinearGradient colors={[colors.scrimStart, colors.scrimEnd]} style={styles.fill} />
        <View style={[styles.heroContent, { paddingTop: insets.top + 12 }]}>
          <View style={s.between}>
            <View />
            <Pressable onPress={() => router.push("/notifications")} hitSlop={8} testID="products-notifications-button"><Ionicons name="notifications-outline" size={22} color={colors.onImage} /></Pressable>
          </View>
          <View>
            <Text style={styles.heroTitle}>Our Products</Text>
            <Text style={styles.heroSub}>{BRAND.name} · {BRAND.location}</Text>
          </View>
        </View>
      </View>
      {products.status === "loading" && !products.data ? <Loading /> : products.status === "failed" && !products.data ? <ErrorState message={products.error ?? "Could not load products"} onRetry={() => dispatch(fetchProducts())} /> : (
        <FlatList
          data={products.data ?? []}
          keyExtractor={(p) => `${p.project_id}-${p.id}`}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 32, gap: 12 }}
          refreshControl={<RefreshControl refreshing={products.status === "loading"} onRefresh={() => dispatch(fetchProducts())} tintColor={colors.brandPrimary} />}
          ListEmptyComponent={<EmptyState icon="map-outline" title="No products yet" body="Products added on the County Green server will appear here." />}
          renderItem={({ item: p }) => (
            <View style={styles.card} testID={`product-card-${p.id}`}>
              <View style={[s.between, { alignItems: "flex-start" }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>{p.name}</Text>
                  <Text style={s.meta}>{[p.project_name, p.display_area && parseFloat(p.display_area) > 0 ? p.display_area : null].filter(Boolean).join(" · ")}</Text>
                </View>
                {p.inventories_count !== undefined ? <Badge label={`${p.inventories_count} unit${p.inventories_count === 1 ? "" : "s"}`} tone="gold" small /> : null}
              </View>
              {p.towers.length ? <Text style={[s.caption, { marginTop: 6 }]}>{p.towers.join(", ")}</Text> : null}
              <Button label="Request for availability" icon="send-outline" variant="gold" small onPress={() => openUnits(p)} style={{ marginTop: spacing.md }} testID={`product-request-${p.id}`} />
            </View>
          )}
        />
      )}
      <BottomSheet visible={!!open} onClose={() => setOpen(null)} title={open?.name ?? "Units"} subtitle="Choose a unit to request its availability from the County Green team." testID="units-sheet">
        {units.status === "loading" ? <Loading /> : units.status === "failed" ? <ErrorState message={units.error ?? "Could not load units"} onRetry={() => open && openUnits(open)} /> : null}
        {units.status === "succeeded" && !units.data?.length ? <Text style={s.bodyMuted}>No units are listed for this product yet.</Text> : null}
        <View style={{ gap: 10 }}>
          {(units.data ?? []).map((u) => {
            const done = requested.includes(u.id);
            const tower = u.project_tower ? u.project_tower.name || u.project_tower.tower : undefined;
            return (
              <View key={u.id} style={styles.unit} testID={`unit-${u.id}`}>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{u.unit_number}</Text>
                  <Text style={s.meta}>{[tower, u.floor ? `Floor ${u.floor}` : null, u.formatted_area].filter(Boolean).join(" · ")}</Text>
                  <View style={{ marginTop: 6, alignSelf: "flex-start" }}><Badge label={u.status_name || u.status} small /></View>
                </View>
                <Button label={done ? "Requested" : "Request"} icon={done ? "checkmark" : "send-outline"} variant={done ? "secondary" : "gold"} small disabled={done || sending === u.id} loading={sending === u.id} onPress={() => request(u.id)} testID={`unit-request-${u.id}`} />
              </View>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  fill: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  hero: { height: 190, backgroundColor: colors.forestDeep },
  heroContent: { flex: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, justifyContent: "space-between" },
  heroTitle: { fontFamily: fonts.display, fontSize: 32, color: colors.onImage },
  heroSub: { fontFamily: fonts.body, fontSize: 13, color: colors.onImageMuted, marginTop: 2 },
  card: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: colors.onSurface },
  unit: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
}));
