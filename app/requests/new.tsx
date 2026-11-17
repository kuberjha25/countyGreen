import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { errorMessage } from "@/src/api";
import { Button, ChoiceChips, ErrorState, Field, Header, Loading, ScreenTitle, Select, useScreenStyles } from "@/src/components/ui";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchProducts, fetchProductUnits } from "@/src/store/catalogSlice";
import { createRequest, fetchRequestTypes } from "@/src/store/requestsSlice";
import { useRun } from "@/src/store/useRun";
import { spacing } from "@/src/theme";
import { useToast } from "@/src/toast";
import { InventoryUnit, isMasked, REQUEST_PRIORITY_LABEL } from "@/src/types";

const MAX = 1000;
const NO_UNIT = "No specific unit";
const tat = (h?: number | null) => (!h ? "" : h % 24 === 0 ? `${h / 24} day${h === 24 ? "" : "s"}` : `${h} hrs`);

// Raise a request (POST /api/partner-requests) — e.g. booking form, allotment letter or receipts.
// Opened from a converted lead with leadName / leadMobile, which pre-fill the remarks.
export default function NewRequest() {
  const params = useLocalSearchParams<{ leadName?: string; leadMobile?: string }>();
  const s = useScreenStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const dispatch = useAppDispatch();
  const types = useAppSelector((st) => st.requests.types);
  const products = useAppSelector((st) => st.catalog.products);
  const [typeId, setTypeId] = useState<number | null>(null);
  const [priority, setPriority] = useState("medium");
  const [product, setProduct] = useState(NO_UNIT);
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [unitId, setUnitId] = useState<number | null>(null);
  const [remarks, setRemarks] = useState(() => (params.leadName ? `Lead: ${params.leadName}${params.leadMobile && !isMasked(params.leadMobile) ? ` (${params.leadMobile})` : ""}\n` : ""));
  const [err, setErr] = useState<string | undefined>();
  const [run, saving] = useRun();

  useEffect(() => {
    dispatch(fetchRequestTypes());
    if (products.status === "idle") dispatch(fetchProducts());
  }, [dispatch, products.status]);

  const productLabel = (p: { name: string; project_name: string }) => `${p.name} · ${p.project_name}`;
  const pickProduct = async (v: string) => {
    setProduct(v);
    setUnitId(null);
    setUnits([]);
    const p = products.data?.find((x) => productLabel(x) === v);
    if (!p) return;
    try {
      setUnits(await dispatch(fetchProductUnits(p)).unwrap());
    } catch (e) {
      toast.show(errorMessage(e), "error");
    }
  };
  const unitLabel = (u: InventoryUnit) => [u.unit_number, u.project_tower?.name || u.project_tower?.tower, u.floor && `Floor ${u.floor}`].filter(Boolean).join(" · ");
  const selectedType = types.data?.find((t) => t.id === typeId);

  const submit = async () => {
    if (!typeId) return setErr("Select the request type");
    if (!remarks.trim()) return setErr("Describe what you need");
    setErr(undefined);
    try {
      const r = await run<{ id: number }>(createRequest({ request_type_id: typeId, remarks: remarks.trim(), priority, inventory_id: unitId ?? undefined }));
      toast.show("Request raised", "success");
      if (r?.id) router.replace(`/requests/${r.id}`);
      else router.replace("/requests");
    } catch (e) {
      setErr(errorMessage(e));
    }
  };

  return (
    <View style={s.screen} testID="new-request-screen">
      <Header title="Raise a Request" showBell={false} />
      <KeyboardAwareScrollView bottomOffset={110} contentContainerStyle={[s.content, { paddingBottom: 120, paddingTop: 8 }]} keyboardShouldPersistTaps="handled">
        <ScreenTitle title="Raise a Request" subtitle="Request documents (booking form, allotment letter, receipts) or raise a query with the County Green team." />

        {types.status === "loading" ? <Loading /> : types.status === "failed" ? <ErrorState message={types.error ?? "Could not load request types"} onRetry={() => dispatch(fetchRequestTypes())} /> : null}
        {types.status === "succeeded" && !types.data?.length ? <Text style={[s.bodyMuted, { marginBottom: spacing.lg }]}>No request types are set up on the County Green server yet.</Text> : null}
        {types.data?.length ? (
          <ChoiceChips label="Request type" value={selectedType?.name} options={types.data.map((t) => t.name)} onChange={(name) => setTypeId(types.data?.find((t) => t.name === name)?.id ?? null)} testID="request-type" />
        ) : null}
        {selectedType?.tat_hours ? <Text style={[s.caption, { marginTop: -8, marginBottom: spacing.lg }]}>Expected turnaround: {tat(selectedType.tat_hours)}</Text> : null}

        <ChoiceChips label="Priority" value={REQUEST_PRIORITY_LABEL[priority]} options={Object.values(REQUEST_PRIORITY_LABEL)} onChange={(v) => setPriority(Object.keys(REQUEST_PRIORITY_LABEL).find((k) => REQUEST_PRIORITY_LABEL[k] === v) ?? "medium")} testID="request-priority" />

        <Select label="Unit (optional)" value={product} options={[NO_UNIT, ...(products.data ?? []).map(productLabel)]} onChange={pickProduct} placeholder={products.status === "loading" ? "Loading…" : "Select product"} icon="grid-outline" testID="request-product" />
        {product !== NO_UNIT ? (
          <Select label="Unit number" value={units.find((u) => u.id === unitId) ? unitLabel(units.find((u) => u.id === unitId)!) : ""} options={units.map(unitLabel)} onChange={(v) => setUnitId(units.find((u) => unitLabel(u) === v)?.id ?? null)} placeholder={units.length ? "Select unit" : "No units listed"} testID="request-unit" />
        ) : null}

        <Field label="Remarks" placeholder="What do you need?" value={remarks} onChangeText={(v) => setRemarks(v.slice(0, MAX))} multiline maxLength={MAX} error={err} testID="request-remarks" />
        <Text style={[s.caption, { textAlign: "right", marginTop: -8 }]}>{remarks.length}/{MAX}</Text>
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + 16 }}>
          <Button label="Submit request" icon="send-outline" variant="gold" onPress={submit} loading={saving} testID="request-submit" />
        </View>
      </KeyboardStickyView>
    </View>
  );
}
