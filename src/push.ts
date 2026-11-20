import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { NativeModules, Platform, TurboModuleRegistry } from "react-native";

import { request } from "@/src/api";

// Push notifications through Firebase Cloud Messaging (same setup as the Meraqui app).
// The FCM token goes to the server with verify-otp / self-registration and to
// POST /api/device/fcm-token once signed in (and whenever Firebase rotates it).
// Every push shows as a normal system notification — also while the app is open — and
// tapping one opens the Notifications screen when signed in, login otherwise (app/_layout.tsx).

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

/** Android channel every push lands in — also Firebase's default channel (firebase.json). */
export const PUSH_CHANNEL_ID = "default";

async function ensureChannel(Notifications: NotificationsModule) {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
    name: "General",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
    vibrationPattern: [0, 250, 250, 250],
  });
}

/** The fcm_token / device_type keys verify-otp and self-registration accept. */
export type PushRegistration = { fcm_token?: string; device_type?: "android" | "ios" };

/** What a push carries: FCM `data` plus the visible title / body. */
export type PushMessage = { data: Record<string, unknown>; title?: string; body?: string; messageId?: string };
type RemoteMessageLike = { messageId?: string; data?: Record<string, unknown>; notification?: { title?: string; body?: string } };

// Title / body come from the `notification` block, or from data.title / data.body (data-only pushes).
function toPushMessage(remote: RemoteMessageLike): PushMessage {
  const data = remote.data ?? {};
  const text = (v: unknown) => (typeof v === "string" && v.trim() ? v : undefined);
  return { data, title: remote.notification?.title ?? text(data.title), body: remote.notification?.body ?? text(data.body) ?? text(data.message), messageId: remote.messageId };
}

// Posts a push as a normal system notification (notification bar + banner). Used for what Firebase
// does not display by itself: every push while the app is open, and data-only pushes in the background.
async function showLocalNotification(message: PushMessage) {
  const Notifications = loadNotifications();
  if (!Notifications || (!message.title && !message.body)) return;
  await ensureChannel(Notifications);
  await Notifications.scheduleNotificationAsync({
    // messageId travels in data so one tap can't be handled twice (banner tap + a Firebase callback).
    content: { title: message.title ?? "County Green", body: message.body ?? "", data: { ...message.data, messageId: message.messageId }, sound: "default" },
    trigger: Platform.OS === "android" ? { channelId: PUSH_CHANNEL_ID } : null,
  });
}

/**
 * Runs at bundle start (index.js), outside React and also in headless mode when a push wakes a
 * closed app: lets notifications this app posts show while it is open, creates the Android channel,
 * and turns data-only background pushes into visible notifications. Never throws.
 */
export function registerPushHandlers() {
  const Notifications = loadNotifications();
  if (Notifications) {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
      });
      ensureChannel(Notifications).catch((error) => console.log("[Push] unable to create the notification channel", error));
    } catch (error) {
      console.log("[Push] unable to set up notification presentation", error);
    }
  }
  const firebase = loadFirebase();
  if (!firebase) return;
  try {
    const { getMessaging, setBackgroundMessageHandler } = firebase.messaging;
    setBackgroundMessageHandler(getMessaging(firebase.app.getApp()), async (remote) => {
      if (remote.notification) return; // already shown by the system
      await showLocalNotification(toPushMessage(remote)).catch((error) => console.log("[Push] unable to show a background push", error));
    });
  } catch (error) {
    console.log("[Push] unable to register the background handler", error);
  }
}

const TOKEN_TIMEOUT_MS = 5000;
const withTimeout = <T>(promise: Promise<T>, ms: number) => Promise.race([promise, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))]);

// Android 13+ needs the POST_NOTIFICATIONS grant, iOS the alert/badge/sound prompt;
// Android also needs a channel before anything can be shown.
async function ensurePermission(): Promise<boolean> {
  const Notifications = loadNotifications();
  if (!Notifications) return false;
  await ensureChannel(Notifications);
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

// Printed in full on its own lines so it can be copied from Metro into
// Firebase console → Messaging → "Send test message". Once per distinct token.
let printedToken: string | undefined;
function printFcmToken(token: string) {
  if (token === printedToken) return;
  printedToken = token;
  const line = "=".repeat(60);
  console.log(`\n${line}\n[Push] FCM TOKEN (${Platform.OS}) — copy for Firebase console test message:\n\n${token}\n\n${line}\n`);
}

// FCM token on both platforms (on iOS Firebase exchanges the APNs token for it).
async function fetchFcmToken(): Promise<string | undefined> {
  const firebase = loadFirebase();
  if (!firebase) return undefined;
  const { getMessaging, getToken, isDeviceRegisteredForRemoteMessages, registerDeviceForRemoteMessages } = firebase.messaging;
  if (!(await ensurePermission())) return undefined;
  const messaging = getMessaging(firebase.app.getApp());
  if (Platform.OS === "ios" && !isDeviceRegisteredForRemoteMessages(messaging)) await registerDeviceForRemoteMessages(messaging);
  const token = (await getToken(messaging)) || undefined;
  if (token) printFcmToken(token);
  return token;
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

/** Once signed in: POST /api/device/fcm-token now and on every token refresh. Returns the unsubscribe. */
export function syncDeviceToken(): () => void {
  getPushRegistration().then((push) => {
    if (push.fcm_token) postDeviceToken(push.fcm_token);
  });
  const firebase = loadFirebase();
  if (!firebase) return () => {};
  try {
    const { getMessaging, onTokenRefresh } = firebase.messaging;
    return onTokenRefresh(getMessaging(firebase.app.getApp()), (token) => {
      printFcmToken(token);
      postDeviceToken(token);
    });
  } catch (error) {
    console.log("[Push] unable to watch FCM token refresh", error);
    return () => {};
  }
}

/**
 * Watches pushes for the whole app session (signed in or not):
 * - `onOpen` when the user taps a notification — one the system displayed (app closed:
 *   getInitialNotification, background: onNotificationOpenedApp) or one this app posted
 *   (expo-notifications response, also when that tap launched the app);
 * - `onForeground` when one arrives while the app is open. Firebase does not display those,
 *   so it is also posted as a normal system notification here.
 * One tap can surface through more than one of these, so each opens once. Never throws.
 */
export function watchPushNotifications(onOpen: (message: PushMessage) => void, onForeground: (message: PushMessage) => void): () => void {
  const opened = new Set<string>();
  const openOnce = (message: PushMessage) => {
    const key = message.messageId ?? JSON.stringify(message.data);
    if (opened.has(key)) return;
    opened.add(key);
    console.log("[Push] notification opened", JSON.stringify({ title: message.title, data: message.data }));
    onOpen(message);
  };
  const cleanups: (() => void)[] = [];

  const Notifications = loadNotifications();
  if (Notifications) {
    try {
      type Response = { notification: { request: { identifier: string; content: { title: string | null; body: string | null; data?: Record<string, unknown> } } } };
      const fromResponse = ({ notification: { request } }: Response): PushMessage => {
        const data = (request.content.data ?? {}) as Record<string, unknown>;
        return { data, title: request.content.title ?? undefined, body: request.content.body ?? undefined, messageId: typeof data.messageId === "string" ? data.messageId : request.identifier };
      };
      const last = Notifications.getLastNotificationResponse();
      if (last) {
        openOnce(fromResponse(last));
        Notifications.clearLastNotificationResponse();
      }
      const sub = Notifications.addNotificationResponseReceivedListener((response) => openOnce(fromResponse(response)));
      cleanups.push(() => sub.remove());
    } catch (error) {
      console.log("[Push] unable to watch notification taps", error);
    }
  }

  const firebase = loadFirebase();
  if (firebase) {
    try {
      const { getMessaging, getInitialNotification, onNotificationOpenedApp, onMessage } = firebase.messaging;
      const messaging = getMessaging(firebase.app.getApp());
      getInitialNotification(messaging)
        .then((remote) => remote && openOnce(toPushMessage(remote)))
        .catch((error) => console.log("[Push] unable to read the launch notification", error));
      cleanups.push(onNotificationOpenedApp(messaging, (remote) => openOnce(toPushMessage(remote))));
      cleanups.push(
        onMessage(messaging, (remote) => {
          const message = toPushMessage(remote);
          console.log("[Push] message received (foreground)", JSON.stringify(remote.notification ?? remote.data ?? {}));
          showLocalNotification(message).catch((error) => console.log("[Push] unable to show a foreground push", error));
          onForeground(message);
        }),
      );
    } catch (error) {
      console.log("[Push] unable to watch FCM messages", error);
    }
  }

  return () => cleanups.forEach((cleanup) => cleanup());
}
