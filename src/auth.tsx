import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { get, TOKEN_KEY, User } from "@/src/api";
import { storage } from "@/src/utils/storage";

type AuthState = {
  ready: boolean;
  token: string | null;
  user: User | null;
  signIn: (token: string, user: User) => Promise<void>;
  setUser: (user: User) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const refresh = useCallback(async () => {
    try {
      const me = await get<User>("/me");
      setUser(me);
    } catch {
      // token invalid → sign out
      await storage.secureRemove(TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await storage.secureGet<string | null>(TOKEN_KEY, null);
      if (saved) {
        setToken(saved);
        await refresh();
      }
      setReady(true);
    })();
  }, [refresh]);

  const signIn = useCallback(async (t: string, u: User) => {
    await storage.secureSet(TOKEN_KEY, t);
    setToken(t);
    setUser(u);
  }, []);

  const signOut = useCallback(async () => {
    await storage.secureRemove(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ ready, token, user, signIn, setUser, refresh, signOut }), [ready, token, user, signIn, refresh, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
