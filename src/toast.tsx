import Ionicons from "@react-native-vector-icons/ionicons";
import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, makeStyles, useTheme } from "@/src/theme";

type Kind = "success" | "error" | "info";
type Toast = { id: number; kind: Kind; message: string };
type Ctx = { show: (message: string, kind?: Kind) => void };

const ToastContext = createContext<Ctx>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const show = useCallback((message: string, kind: Kind = "info") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const value = useMemo(() => ({ show }), [show]);
  const iconFor: Record<Kind, any> = { success: "checkmark-circle", error: "alert-circle", info: "information-circle" };
  const bgFor: Record<Kind, string> = { success: colors.success, error: colors.error, info: colors.surfaceInverse };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="none" style={[styles.host, { top: insets.top + 8 }]}>
        {toasts.map((t) => (
          <Animated.View key={t.id} entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(180)} style={[styles.toast, { backgroundColor: bgFor[t.kind] }]} testID={`toast-${t.kind}`}>
            <Ionicons name={iconFor[t.kind]} size={18} color={colors.onSurfaceInverse} />
            <Text style={styles.text}>{t.message}</Text>
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

const useStyles = makeStyles((colors) => ({
  host: { position: "absolute", left: 16, right: 16, gap: 8, zIndex: 1000 },
  toast: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 },
  text: { color: colors.onSurfaceInverse, fontFamily: fonts.medium, fontSize: 14, flex: 1 },
}));
