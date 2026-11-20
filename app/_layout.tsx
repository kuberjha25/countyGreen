import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { LogBox, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaInsetsContext, SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { syncDeviceToken, watchPushNotifications } from "@/src/push";
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
  // Push: register this device's FCM token once signed in (and on every refresh).
  useEffect(() => (signedIn ? syncDeviceToken() : undefined), [signedIn]);
  return <>{children}</>;
}

// Push notifications for the whole app session (signed in or not). One that arrives while the
// app is open is posted as a normal system notification (inside watchPushNotifications).
// Tapping any notification — app closed, in the background or open:
//   signed in  → always the Notifications screen (whatever the notification's type);
//   signed out → the login screen only; the tap is dropped, so signing in does NOT open Notifications.
// A tap that launched the app waits until the session is restored and the splash has routed.
function PushTaps() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const segments = useSegments();
  const { ready, signedIn } = useAppSelector((s) => ({ ready: s.auth.ready, signedIn: !!s.auth.token && !!s.auth.user }), (a, b) => a.ready === b.ready && a.signedIn === b.signedIn);
  const pendingTap = useRef(false);
  const [taps, setTaps] = useState(0); // bumps on every tap so the effect below runs

  useEffect(
    () =>
      watchPushNotifications(
        () => {
          pendingTap.current = true;
          setTaps((n) => n + 1);
        },
        () => {
          if (store.getState().auth.token) dispatch(fetchNotifications());
        },
      ),
    [dispatch],
  );

  const route = segments as string[];
  const onSplash = route.length === 0; // app/index.tsx decides home vs login first
  const top = route[0];
  useEffect(() => {
    if (!pendingTap.current || !ready || onSplash) return;
    pendingTap.current = false;
    if (signedIn) {
      dispatch(fetchNotifications());
      if (top !== "notifications") router.push("/notifications");
    } else if (top !== "(auth)") {
      router.replace("/(auth)/login");
    }
  }, [taps, ready, onSplash, signedIn, top, router, dispatch]);

  return null;
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
                  <PushTaps />
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
