import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { request } from "@/src/api";
import { addListCases, emptyList, Entry, ListArgs, ListState, cleanParams } from "@/src/store/list";
import type { DocumentItem, Envelope, NewsItem, NotificationItem, Paginated, ProjectDocuments } from "@/src/types";

type ContentState = {
  news: ListState<NewsItem>;
  newsById: Record<number, Entry<NewsItem>>;
  documents: Entry<DocumentItem[]>;
  notifications: Entry<NotificationItem[]>;
};
const initialState: ContentState = { news: emptyList<NewsItem>(), newsById: {}, documents: { status: "idle" }, notifications: { status: "idle" } };

// GET /api/news — category (projects | construction_updates | offers | events), search, page.
export const fetchNews = createAsyncThunk("content/news", async ({ params, page = 1 }: ListArgs) => (await request<Envelope<Paginated<NewsItem>>>("/news", { query: { ...cleanParams(params), page } })).data);
export const fetchNewsItem = createAsyncThunk("content/newsItem", async (id: number) => (await request<Envelope<NewsItem>>(`/news/${id}`)).data);

// GET /api/documents is grouped by project; flattened here (all pages).
export const fetchDocuments = createAsyncThunk("content/documents", async () => {
  const out: DocumentItem[] = [];
  for (let page = 1, last = 1; page <= last && page <= 10; page++) {
    const r = (await request<Envelope<Paginated<ProjectDocuments>>>("/documents", { query: { page } })).data;
    last = r.last_page ?? 1;
    r.data.forEach((p) => (p.documents ?? []).forEach((d) => out.push({ ...d, project_name: p.name })));
  }
  return out;
});

// Latest 20, not paginated. Envelope uses "success" instead of "status".
export const fetchNotifications = createAsyncThunk("content/notifications", async () => (await request<{ success: boolean; data: NotificationItem[] }>("/notifications")).data ?? []);
export const markNotificationRead = createAsyncThunk("content/notificationRead", async (id: number) => {
  await request(`/notifications/${id}/read`, { method: "POST" });
  return id;
});
// No "mark all" endpoint: one call per unread notification.
export const markAllNotificationsRead = createAsyncThunk("content/notificationsReadAll", async (ids: number[]) => {
  await Promise.all(ids.map((id) => request(`/notifications/${id}/read`, { method: "POST" })));
  return ids;
});

const slice = createSlice({
  name: "content",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    addListCases(b, fetchNews, (s) => s.news);
    b.addCase(fetchNewsItem.pending, (s, a) => {
      s.newsById[a.meta.arg] = { ...s.newsById[a.meta.arg], status: "loading", error: undefined };
    })
      .addCase(fetchNewsItem.fulfilled, (s, a) => {
        s.newsById[a.meta.arg] = { data: a.payload, status: "succeeded" };
      })
      .addCase(fetchNewsItem.rejected, (s, a) => {
        s.newsById[a.meta.arg] = { ...s.newsById[a.meta.arg], status: "failed", error: a.error.message };
      })
      .addCase(fetchDocuments.pending, (s) => {
        s.documents = { ...s.documents, status: "loading", error: undefined };
      })
      .addCase(fetchDocuments.fulfilled, (s, a) => {
        s.documents = { data: a.payload, status: "succeeded" };
      })
      .addCase(fetchDocuments.rejected, (s, a) => {
        s.documents = { ...s.documents, status: "failed", error: a.error.message };
      })
      .addCase(fetchNotifications.pending, (s) => {
        s.notifications = { ...s.notifications, status: "loading", error: undefined };
      })
      .addCase(fetchNotifications.fulfilled, (s, a) => {
        s.notifications = { data: a.payload, status: "succeeded" };
      })
      .addCase(fetchNotifications.rejected, (s, a) => {
        s.notifications = { ...s.notifications, status: "failed", error: a.error.message };
      })
      .addCase(markNotificationRead.fulfilled, (s, a) => {
        s.notifications.data?.forEach((n) => n.id === a.payload && (n.is_read = true));
      })
      .addCase(markAllNotificationsRead.fulfilled, (s, a) => {
        s.notifications.data?.forEach((n) => a.payload.includes(n.id) && (n.is_read = true));
      });
  },
});

export default slice.reducer;
