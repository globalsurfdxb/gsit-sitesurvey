"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { countPendingFiles, listAllSurveys, onLocalChange } from "@/lib/local-db";
import { api, ApiError, syncNow } from "@/lib/sync";
import type { SessionUser } from "@/lib/types";

export type SyncStatus = "idle" | "syncing" | "ok" | "offline" | "auth" | "error";

interface AppCtx {
  user: SessionUser | null;
  ready: boolean;
  online: boolean;
  status: SyncStatus;
  lastSync: number | null;
  pending: number;
  /** Sync soon (debounced). Pass `now` for an immediate, user-triggered sync. */
  requestSync: (now?: boolean) => void;
  logout: () => Promise<void>;
}

const Ctx = createContext<AppCtx | null>(null);
export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside AppProvider");
  return c;
};

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

const USER_CACHE = "gs_user";
const readCachedUser = (): SessionUser | null => {
  try {
    return JSON.parse(localStorage.getItem(USER_CACHE) ?? "null");
  } catch {
    return null;
  }
};

export function AppProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const onLogin = pathname === "/login";

  const [user, setUser] = useState<SessionUser | null>(null);
  const [checked, setChecked] = useState(false); // identity check finished (the login page needs none)
  const ready = onLogin || checked;
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [pending, setPending] = useState(0);
  const userRef = useRef<SessionUser | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Who is signed in? Falls back to the last known user when offline.
  useEffect(() => {
    if (onLogin) return;
    let live = true;
    api<{ user: SessionUser }>("/api/auth/me")
      .then(({ user }) => {
        if (!live) return;
        localStorage.setItem(USER_CACHE, JSON.stringify(user));
        userRef.current = user;
        setUser(user);
      })
      .catch((e) => {
        if (!live) return;
        if (e instanceof ApiError && e.status === 401) {
          localStorage.removeItem(USER_CACHE);
          router.replace("/login");
          return;
        }
        const cached = readCachedUser(); // network down: keep working with the cached identity
        userRef.current = cached;
        setUser(cached);
      })
      .finally(() => live && setChecked(true));
    return () => {
      live = false;
    };
  }, [onLogin, router]);

  const refreshPending = useCallback(async () => {
    const u = userRef.current;
    if (!u) return setPending(0);
    const s = (await listAllSurveys()).filter((x) => x.ownerId === u.id || u.role === "admin");
    setPending(s.filter((x) => x.dirty || x.deleted).length + (await countPendingFiles()));
  }, []);

  const runSync = useCallback(async () => {
    const u = userRef.current;
    if (!u || !navigator.onLine) return;
    setStatus("syncing");
    const r = await syncNow(u);
    setStatus(r.ok ? "ok" : r.auth ? "auth" : r.offline ? "offline" : "error");
    if (r.ok) setLastSync(Date.now());
    refreshPending();
  }, [refreshPending]);

  const requestSync = useCallback(
    (now?: boolean) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(runSync, now ? 0 : 4000);
    },
    [runSync],
  );

  // Connectivity + periodic + resume triggers.
  useEffect(() => {
    const on = () => requestSync(true); // connection came back: push what we queued
    const vis = () => document.visibilityState === "visible" && requestSync();
    window.addEventListener("online", on);
    document.addEventListener("visibilitychange", vis);
    const iv = setInterval(() => requestSync(), 60_000);
    const unsub = onLocalChange(() => refreshPending());
    return () => {
      window.removeEventListener("online", on);
      document.removeEventListener("visibilitychange", vis);
      clearInterval(iv);
      unsub();
    };
  }, [requestSync, refreshPending]);

  useEffect(() => {
    if (user) {
      refreshPending();
      requestSync(true);
    }
  }, [user, refreshPending, requestSync]);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    localStorage.removeItem(USER_CACHE);
    userRef.current = null;
    setUser(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, ready, online, status, lastSync, pending, requestSync, logout }),
    [user, ready, online, status, lastSync, pending, requestSync, logout],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
