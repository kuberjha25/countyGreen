import Ionicons from "@react-native-vector-icons/ionicons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useState } from "react";
import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";

import { del, get, patch, post } from "@/src/api";
import { useCan } from "@/src/auth";
import { IMAGES, img, Product } from "@/src/brand";
import { BottomNav, BottomSheet, Button, ConfirmSheet, EmptyState, ErrorState, Field, Header, Loading, useScreenStyles } from "@/src/components/ui";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useToast } from "@/src/toast";

const EMPTY = { name: "", category: "", description: "", image: "golden" };

// Admin · Our Products — add, edit, delete and order the products partners can request.
export default function ManageProducts() {
  const s = useScreenStyles();
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const qc = useQueryClient();
  const can = useCan();
  const products = useQuery({ queryKey: ["products"], queryFn: () => get<Product[]>("/products") });
  const [form, setForm] = useState<typeof EMPTY & { id?: string }>(EMPTY);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const save = useMutation({
    mutationFn: () => (form.id ? patch(`/products/${form.id}`, form) : post("/products", form)),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast.show(form.id ? "Product updated" : "Product added", "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });
  const remove = useMutation({
    mutationFn: () => del(`/products/${deleting?.id}`),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
      toast.show("Product deleted", "success");
    },
    onError: (e: Error) => toast.show(e.message, "error"),
  });
  const list = products.data ?? [];
  const edit = (p?: Product) => {
    setForm(p ? { id: p.id, name: p.name, category: p.category, description: p.description, image: p.image } : EMPTY);
    setOpen(true);
  };

  return (
    <View style={s.screen} testID="manage-products-screen">
      <Header title="Our Products" right={can("products", "add") ? <Pressable onPress={() => edit()} style={styles.addBtn} testID="product-add-button"><Ionicons name="add" size={22} color={colors.onBrandSecondary} /></Pressable> : undefined} />
      {products.isLoading ? <Loading /> : products.isError ? <ErrorState message={(products.error as Error).message} onRetry={products.refetch} /> : (
        <FlatList
          data={list}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 32, gap: 10 }}
          refreshControl={<RefreshControl refreshing={products.isRefetching} onRefresh={products.refetch} tintColor={colors.brandPrimary} />}
          ListHeaderComponent={<View style={{ marginBottom: spacing.sm }}><Text style={[s.h2, { fontSize: 30 }]}>Manage Products</Text><Text style={s.bodyMuted}>Shown to partners under Our Products, each with “Request for Availability”.</Text></View>}
          ListEmptyComponent={<EmptyState icon="map-outline" title="No products" body="Add the first product." />}
          renderItem={({ item: p }) => (
            <View style={styles.card} testID={`manage-product-${p.id}`}>
              <Image source={img(p.image)} style={styles.thumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{p.name}</Text>
                <Text style={s.meta} numberOfLines={1}>{p.category || "—"}</Text>
              </View>
              <View style={[s.row, { gap: 14 }]}>
                {can("products", "edit") ? <Pressable onPress={() => edit(p)} hitSlop={6} testID={`product-edit-${p.id}`}><Ionicons name="pencil-outline" size={18} color={colors.brandPrimary} /></Pressable> : null}
                {can("products", "delete") ? <Pressable onPress={() => setDeleting(p)} hitSlop={6} testID={`product-delete-${p.id}`}><Ionicons name="trash-outline" size={18} color={colors.error} /></Pressable> : null}
              </View>
            </View>
          )}
        />
      )}
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={form.id ? "Edit product" : "Add product"} testID="product-form-sheet">
        <Field label="Product name" placeholder="e.g. 750 Sq. Yards" value={form.name} onChangeText={(name) => setForm((x) => ({ ...x, name }))} testID="product-name-input" />
        <Field label="Category" placeholder="e.g. Residential Plot" value={form.category} onChangeText={(category) => setForm((x) => ({ ...x, category }))} testID="product-category-input" />
        <Field label="Description" placeholder="Short description for partners" value={form.description} onChangeText={(description) => setForm((x) => ({ ...x, description }))} multiline testID="product-description-input" />
        <Text style={styles.label}>IMAGE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: spacing.lg }}>
          {Object.keys(IMAGES).map((k) => (
            <Pressable key={k} onPress={() => setForm((x) => ({ ...x, image: k }))} style={[styles.pick, form.image === k && styles.pickSel]} testID={`product-image-${k}`}>
              <Image source={IMAGES[k]} style={{ width: 64, height: 48, borderRadius: radius.sm }} contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>
        <Button label={form.id ? "Save product" : "Add product"} icon="checkmark" variant="gold" onPress={() => save.mutate()} loading={save.isPending} testID="product-save-button" />
      </BottomSheet>
      <ConfirmSheet visible={!!deleting} onClose={() => setDeleting(null)} title="Delete product?" body={`"${deleting?.name ?? ""}" will be removed from Our Products. Existing availability requests are kept.`} confirmLabel="Delete" danger onConfirm={() => remove.mutate()} loading={remove.isPending} testID="product-delete" />
      <BottomNav active="products" />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandSecondary, alignItems: "center", justifyContent: "center" },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  label: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.4, color: colors.onSurfaceTertiary, marginBottom: 8 },
  pick: { padding: 2, borderRadius: radius.sm + 2, borderWidth: 2, borderColor: "transparent" },
  pickSel: { borderColor: colors.brandPrimary },
}));
