import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { LogBox, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaInsetsContext, SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { syncDeviceToken } from "@/src/push";
import { store, useAppDispatch, useAppSelector } from "@/src/store";
import { restoreSession } from "@/src/store/authSlice";
import { fetchNotifications } from "@/src/store/contentSlice";
import { ToastProvider } from "@/src/toast";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync().catch(() => {});

// Design-export mode (web only, `?frame=1`): emulate iPhone safe-area insets so
// captured screens sit correctly inside a device mockup.
const FRAME_INSETS =
  Platform.OS === "web" && typeof window !== "undefined" && new URLSearchParams(window.location.search).get("frame") === "1"
    ? { top: 54, bottom: 34, left: 0, right: 0 }
    : null;

// Restores the saved token and loads the profile once on launch.
function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const signedIn = useAppSelector((s) => !!s.auth.token && !!s.auth.user);
  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);
  // Push: register this device's FCM token once signed in (and on every refresh);
  // a message received while the app is open also refreshes the notification list.
  useEffect(() => (signedIn ? syncDeviceToken(() => dispatch(fetchNotifications())) : undefined), [signedIn, dispatch]);
  return <>{children}</>;
}

function FrameInsets({ children }: { children: React.ReactNode }) {
  if (!FRAME_INSETS) return <>{children}</>;
  return <SafeAreaInsetsContext.Provider value={FRAME_INSETS}>{children}</SafeAreaInsetsContext.Provider>;
}

export default function RootLayout() {
  const [loaded] = useFonts({
    "Cormorant-Medium": require("../assets/fonts/Cormorant-Medium.ttf"),
    "Cormorant-SemiBold": require("../assets/fonts/Cormorant-SemiBold.ttf"),
    "Cormorant-Italic": require("../assets/fonts/Cormorant-Italic.ttf"),
    "Jakarta-Regular": require("../assets/fonts/Jakarta-Regular.ttf"),
    "Jakarta-Medium": require("../assets/fonts/Jakarta-Medium.ttf"),
    "Jakarta-SemiBold": require("../assets/fonts/Jakarta-SemiBold.ttf"),
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  // One app level ErrorBoundary; a render crash shows a reload screen
  // instead of a blank app.
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <FrameInsets>
          <KeyboardProvider>
            <Provider store={store}>
              <SessionBootstrap>
                <ToastProvider>
                  <StatusBar style="dark" />
                  <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
                    <Stack.Screen name="index" options={{ animation: "fade" }} />
                    <Stack.Screen name="(auth)" options={{ animation: "fade" }} />
                    <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
                  </Stack>
                </ToastProvider>
              </SessionBootstrap>
            </Provider>
          </KeyboardProvider>
          </FrameInsets>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
