import { router } from "expo-router";
import { Alert } from "react-native";

import { request } from "@/src/api";
import type { Envelope, Paginated } from "@/src/types";
import { storage } from "@/src/utils/storage";

// In-app prompt for News / Events published since the app last checked — works even when a push
// was missed or notifications are off. The first run on a device only records what exists, so a
// fresh install isn't greeted with old posts.
const SEEN_KEY = "cg_whats_new_seen"; // "<newsId>:<eventId>"
type Latest = { id: number; title: string } | null;

async function latest(path: string, query?: Record<string, string>): Promise<Latest> {
  try {
    const items = (await request<Envelope<Paginated<{ id: number; title: string }>>>(path, { query })).data.data ?? [];
    return items.reduce<Latest>((top, i) => (!top || i.id > top.id ? { id: i.id, title: i.title } : top), null);
  } catch {
    return null;
  }
}

let running = false;
export async function promptWhatsNew() {
  if (running) return;
  running = true;
  try {
    const [news, event] = await Promise.all([latest("/news"), latest("/promotions", { promotion_type: "event" })]);
    if (!news && !event) return;
    const raw = await storage.getItem<string | null>(SEEN_KEY, null);
    const [seenNews, seenEvent] = raw ? String(raw).split(":").map(Number) : [];
    await storage.setItem(SEEN_KEY, `${Math.max(seenNews || 0, news?.id ?? 0)}:${Math.max(seenEvent || 0, event?.id ?? 0)}`);
    if (!raw) return;

    const freshNews = news && news.id > (seenNews || 0) ? news : null;
    const freshEvent = event && event.id > (seenEvent || 0) ? event : null;
    const later = { text: "Later", style: "cancel" as const };
    if (freshNews && freshEvent) {
      Alert.alert("What's New", `News: ${freshNews.title}\nEvent: ${freshEvent.title}`, [later, { text: "View News", onPress: () => router.push(`/news/${freshNews.id}`) }, { text: "View Event", onPress: () => router.push(`/events/${freshEvent.id}`) }]);
    } else if (freshNews) {
      Alert.alert("New Update", freshNews.title, [later, { text: "View", onPress: () => router.push(`/news/${freshNews.id}`) }]);
    } else if (freshEvent) {
      Alert.alert("New Event", freshEvent.title, [later, { text: "View", onPress: () => router.push(`/events/${freshEvent.id}`) }]);
    }
  } finally {
    running = false;
  }
}
