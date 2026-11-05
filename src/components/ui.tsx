"use client";

import type { SyncStatus } from "./AppProvider";

export function ProgressRing({ pct, label }: { pct: number; label?: string }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <div className="ring" role="img" aria-label={`${pct}% of required fields complete${label ? ` (${label})` : ""}`} title={label}>
      <svg width="44" height="44" viewBox="0 0 44 44" aria-hidden>
        <circle cx="22" cy="22" r={r} className="ring-bg" />
        <circle cx="22" cy="22" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} transform="rotate(-90 22 22)" />
      </svg>
      <span>{pct}%</span>
    </div>
  );
}

export function syncLabel(status: SyncStatus, online: boolean, pending: number): { text: string; tone: "ok" | "warn" | "bad" | "busy" } {
  if (status === "auth") return { text: "Sign in to sync", tone: "bad" };
  if (!online || status === "offline") return { text: pending ? `Offline · ${pending} waiting` : "Offline", tone: "warn" };
  if (status === "syncing" || status === "idle") return { text: "Syncing…", tone: "busy" }; // idle = first sync not finished yet
  if (status === "error") return { text: "Sync failed · retrying", tone: "bad" };
  if (pending) return { text: `${pending} waiting to sync`, tone: "warn" };
  return { text: "Synced", tone: "ok" };
}
