import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { NativeModules, Platform, TurboModuleRegistry } from "react-native";

import { request } from "@/src/api";

// Push notifications through Firebase Cloud Messaging (same setup as the Meraqui app).
// The FCM token goes to the server with verify-otp / self-registration and to
// POST /api/device/fcm-token once signed in (and whenever Firebase rotates it).

type FirebaseAppModule = typeof import("@react-native-firebase/app");
type FirebaseMessagingModule = typeof import("@react-native-firebase/messaging");
type NotificationsModule = typeof import("expo-notifications");

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// expo-notifications throws on Android in Expo Go as soon as it is evaluated, so it is
// required lazily. Push needs a development / EAS build anyway; Expo Go just skips it.
function loadNotifications(): NotificationsModule | null {
  if (isExpoGo) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy: throws in Expo Go when evaluated
    return require("expo-notifications") as NotificationsModule;
  } catch (error) {
    console.log("[Push] expo-notifications unavailable in this build", error);
    return null;
  }
}

// React Native Firebase is only in builds made after it was added (not in Expo Go).
// Requiring it without the native module throws even inside try/catch, so check first.
function hasFirebaseNativeModule(): boolean {
  if (isExpoGo) return false;
  return TurboModuleRegistry.get("NativeRNFBTurboApp") != null || NativeModules.RNFBAppModule != null;
}

function loadFirebase(): { app: FirebaseAppModule; messaging: FirebaseMessagingModule } | null {
  if (!hasFirebaseNativeModule()) return null;
  try {
    return {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- only once the native module exists
      app: require("@react-native-firebase/app") as FirebaseAppModule,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      messaging: require("@react-native-firebase/messaging") as FirebaseMessagingModule,
    };
  } catch (error) {
    console.log("[Push] React Native Firebase unavailable in this build", error);
    return null;
  }
}

/** The fcm_token / device_type keys verify-otp and self-registration accept. */
export type PushRegistration = { fcm_token?: string; device_type?: "android" | "ios" };

const TOKEN_TIMEOUT_MS = 5000;
const withTimeout = <T>(promise: Promise<T>, ms: number) => Promise.race([promise, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))]);

// Android 13+ needs the POST_NOTIFICATIONS grant, iOS the alert/badge/sound prompt;
// Android also needs a channel before anything can be shown.
async function ensurePermission(): Promise<boolean> {
  const Notifications = loadNotifications();
  if (!Notifications) return false;
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", { name: "default", importance: Notifications.AndroidImportance.HIGH });
  }
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

// FCM token on both platforms (on iOS Firebase exchanges the APNs token for it).
async function fetchFcmToken(): Promise<string | undefined> {
  const firebase = loadFirebase();
  if (!firebase) return undefined;
  const { getMessaging, getToken, isDeviceRegisteredForRemoteMessages, registerDeviceForRemoteMessages } = firebase.messaging;
  if (!(await ensurePermission())) return undefined;
  const messaging = getMessaging(firebase.app.getApp());
  if (Platform.OS === "ios" && !isDeviceRegisteredForRemoteMessages(messaging)) await registerDeviceForRemoteMessages(messaging);
  return (await getToken(messaging)) || undefined;
}

/**
 * Best-effort FCM registration for login / registration requests. Never throws and
 * never blocks for long — a missing token must not stop anyone signing in.
 */
export async function getPushRegistration(): Promise<PushRegistration> {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return {};
  const device_type = Platform.OS;
  if (!Device.isDevice) return { device_type };
  try {
    const fcm_token = await withTimeout(fetchFcmToken(), TOKEN_TIMEOUT_MS);
    if (fcm_token) console.log(`[Push] FCM token ${fcm_token.slice(0, 12)}…`);
    return fcm_token ? { fcm_token, device_type } : { device_type };
  } catch (error) {
    console.log("[Push] unable to get FCM token", error);
    return { device_type };
  }
}

async function postDeviceToken(fcm_token: string) {
  if (Platform.OS !== "android" && Platform.OS !== "ios") return;
  try {
    await request("/device/fcm-token", { method: "POST", body: { fcm_token, device_type: Platform.OS } });
  } catch (error) {
    console.log("[Push] unable to save FCM token", error);
  }
}

/**
 * Once signed in: POST /api/device/fcm-token now and on every token refresh, and show
 * messages that arrive while the app is open (FCM does not display those by itself).
 * `onMessage` lets the app refresh its notification list. Returns the unsubscribe.
 */
export function syncDeviceToken(onMessage?: () => void): () => void {
  getPushRegistration().then((push) => {
    if (push.fcm_token) postDeviceToken(push.fcm_token);
  });
  const firebase = loadFirebase();
  if (!firebase) return () => {};
  const Notifications = loadNotifications();
  try {
    const { getMessaging, onTokenRefresh, onMessage: onForegroundMessage } = firebase.messaging;
    const messaging = getMessaging(firebase.app.getApp());
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
    const offRefresh = onTokenRefresh(messaging, (token) => postDeviceToken(token));
    const offMessage = onForegroundMessage(messaging, async (message) => {
      console.log("[Push] message received", JSON.stringify(message.notification ?? message.data ?? {}));
      onMessage?.();
      const title = message.notification?.title ?? (message.data?.title as string | undefined);
      const body = message.notification?.body ?? (message.data?.body as string | undefined) ?? (message.data?.message as string | undefined);
      if (Notifications && (title || body)) await Notifications.scheduleNotificationAsync({ content: { title: title ?? "County Green", body: body ?? "" }, trigger: null });
    });
    return () => {
      offRefresh();
      offMessage();
    };
  } catch (error) {
    console.log("[Push] unable to watch FCM messages", error);
    return () => {};
  }
}
