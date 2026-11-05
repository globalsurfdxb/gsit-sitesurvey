"use client";

import { useEffect } from "react";
import { useApp } from "./AppProvider";

/** Registers the service worker (production only) and pre-caches the app once signed in. */
export function PwaRegister() {
  const { user } = useApp();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((e) => console.warn("[pwa] SW registration failed", e));
  }, []);

  useEffect(() => {
    if (!user || process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then((reg) => reg.active?.postMessage({ type: "WARM" }));
    // Ask the browser not to evict our IndexedDB data when storage runs low.
    navigator.storage?.persist?.().catch(() => undefined);
  }, [user]);

  return null;
}
