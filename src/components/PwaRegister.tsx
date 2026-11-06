"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useApp } from "./AppProvider";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
}
declare global {
  interface Window {
    __gsInstall?: InstallEvent | null;
  }
}

const INSTALL_EVT = "gs-install-available";

/** The browser's "install app" prompt, if it offered one this session. */
export function useInstallPrompt(): { available: boolean; install: () => Promise<void> } {
  const evt = useSyncExternalStore(
    (cb) => {
      window.addEventListener(INSTALL_EVT, cb);
      return () => window.removeEventListener(INSTALL_EVT, cb);
    },
    () => window.__gsInstall ?? null,
    () => null,
  );
  return {
    available: !!evt,
    install: async () => {
      if (!evt) return;
      await evt.prompt();
      window.__gsInstall = null;
      window.dispatchEvent(new Event(INSTALL_EVT));
    },
  };
}

/** Registers the service worker (production only), pre-caches the app once signed in, and captures the install prompt. */
export function PwaRegister() {
  const { user } = useApp();

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      window.__gsInstall = e as InstallEvent;
      window.dispatchEvent(new Event(INSTALL_EVT));
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

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
