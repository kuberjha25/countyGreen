import { combineReducers, configureStore, Middleware, UnknownAction } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";

import auth, { logout, sessionExpired } from "@/src/store/authSlice";
import catalog from "@/src/store/catalogSlice";
import content from "@/src/store/contentSlice";
import dashboard from "@/src/store/dashboardSlice";
import leads from "@/src/store/leadsSlice";
import lookups from "@/src/store/lookupsSlice";
import registrations from "@/src/store/registrationsSlice";
import visits from "@/src/store/visitsSlice";
import { API_LOGS, setUnauthorizedHandler } from "@/src/api";

const appReducer = combineReducers({ auth, catalog, content, dashboard, leads, lookups, registrations, visits });

// Logging out (or an expired token) clears every slice except the auth "ready" flag.
const rootReducer = (state: ReturnType<typeof appReducer> | undefined, action: UnknownAction) => {
  if (logout.fulfilled.match(action) || sessionExpired.match(action)) {
    return appReducer({ auth: appReducer(undefined, action).auth } as ReturnType<typeof appReducer>, action);
  }
  return appReducer(state, action);
};

// Phone testing: prints every Redux action (thunk pending / fulfilled / rejected) to the console.
const logger: Middleware = () => (next) => (action) => {
  const a = action as UnknownAction & { error?: { message?: string }; meta?: { arg?: unknown } };
  if (a.type.endsWith("/rejected")) console.warn(`[Redux] ${a.type} — ${a.error?.message ?? "error"}`);
  else if (a.type.endsWith("/pending")) console.log(`[Redux] ${a.type}${a.meta?.arg !== undefined && a.meta.arg !== "" && typeof a.meta.arg !== "object" ? ` (${String(a.meta.arg)})` : ""}`);
  else console.log(`[Redux] ${a.type}`);
  return next(action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) =>
    getDefault({
      // FormData (multipart uploads) travels in thunk args; picked files sit in the registration draft.
      serializableCheck: { ignoredActionPaths: ["meta.arg", "payload"], ignoredPaths: ["auth.draft"] },
    }).concat(API_LOGS ? [logger] : []),
});

setUnauthorizedHandler(() => {
  store.dispatch(logout());
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
