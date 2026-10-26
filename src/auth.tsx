import { useCallback } from "react";

import { Action, can, ModuleKey } from "@/src/access";
import { useAppDispatch, useAppSelector } from "@/src/store";
import { fetchProfile, logout } from "@/src/store/authSlice";

// Session state lives in Redux (src/store/authSlice.ts); this hook keeps the screens' API small.
export function useAuth() {
  const dispatch = useAppDispatch();
  const { ready, token, user, stats, sessionError } = useAppSelector((s) => s.auth);
  const signOut = useCallback(() => dispatch(logout()).unwrap(), [dispatch]);
  const refresh = useCallback(() => dispatch(fetchProfile()).unwrap(), [dispatch]);
  return { ready, token, user, stats, sessionError, signOut, refresh };
}

// can("leads", "add") for the signed-in user.
export function useCan() {
  const user = useAppSelector((s) => s.auth.user);
  return useCallback((module: ModuleKey, action: Action) => can(user, module, action), [user]);
}
