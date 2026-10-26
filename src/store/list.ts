import type { ActionReducerMapBuilder, AsyncThunk, Draft } from "@reduxjs/toolkit";

import type { Paginated } from "@/src/types";

// State for a server-paginated list (Laravel paginator, ?page=N).
export type Status = "idle" | "loading" | "succeeded" | "failed";
export type ListState<T> = {
  items: T[];
  page: number;
  lastPage: number;
  total: number;
  status: Status;
  loadingMore: boolean;
  error?: string;
  params: Record<string, string>;
  requestId?: string;
};
export const emptyList = <T>(): ListState<T> => ({ items: [], page: 0, lastPage: 1, total: 0, status: "idle", loadingMore: false, params: {} });

export type ListArgs = { params?: Record<string, string | undefined>; page?: number };
export const cleanParams = (p: Record<string, string | undefined> = {}) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== "" && v !== "all")) as Record<string, string>;

// Wires pending / fulfilled / rejected of a list thunk into a ListState. Page 1 replaces
// the list; later pages append. Responses of superseded page-1 requests are ignored.
export function addListCases<S, T>(builder: ActionReducerMapBuilder<S>, thunk: AsyncThunk<Paginated<T>, ListArgs, any>, pick: (s: Draft<S>) => ListState<T>) {
  builder
    .addCase(thunk.pending, (s, a) => {
      const l = pick(s);
      const page = a.meta.arg.page ?? 1;
      if (page === 1) {
        l.status = "loading";
        l.requestId = a.meta.requestId;
        l.params = cleanParams(a.meta.arg.params);
      } else l.loadingMore = true;
      l.error = undefined;
    })
    .addCase(thunk.fulfilled, (s, a) => {
      const l = pick(s);
      const page = a.meta.arg.page ?? 1;
      if (page === 1 && a.meta.requestId !== l.requestId) return;
      const data = a.payload;
      l.items = (page === 1 ? data.data : [...l.items, ...data.data]) as any;
      l.page = data.current_page ?? page;
      l.lastPage = data.last_page ?? 1;
      l.total = data.total ?? l.items.length;
      l.status = "succeeded";
      l.loadingMore = false;
    })
    .addCase(thunk.rejected, (s, a) => {
      const l = pick(s);
      const page = a.meta.arg.page ?? 1;
      if (page === 1 && a.meta.requestId !== l.requestId) return;
      l.loadingMore = false;
      if (page === 1) l.status = "failed";
      l.error = (a.error as { message?: string })?.message ?? "Something went wrong";
    });
}

export type Entry<T> = { data?: T; status: Status; error?: string };
