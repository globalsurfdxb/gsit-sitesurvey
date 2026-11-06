"use client";

import { useApp, type SyncStatus } from "../AppProvider";
import { Icon } from "../ui/Icon";

export function syncLabel(status: SyncStatus, online: boolean, pending: number): { text: string; tone: "ok" | "warn" | "bad" | "busy" } {
  if (status === "auth") return { text: "Sign in to sync", tone: "bad" };
  if (!online || status === "offline") return { text: pending ? `Offline · ${pending} waiting` : "Offline", tone: "warn" };
  if (status === "syncing" || status === "idle") return { text: "Syncing…", tone: "busy" }; // idle = first sync not finished yet
  if (status === "error") return { text: "Sync failed · retrying", tone: "bad" };
  if (pending) return { text: `${pending} waiting to sync`, tone: "warn" };
  return { text: "All synced", tone: "ok" };
}

/** Compact connection/sync indicator. Tap to sync now. */
export function SyncChip({ compact }: { compact?: boolean }) {
  const { online, status, pending, requestSync } = useApp();
  const s = syncLabel(status, online, pending);
  return (
    <button className={`sync-chip ${s.tone}`} onClick={() => requestSync(true)} aria-label={`Sync status: ${s.text}. Tap to sync now.`} title="Tap to sync now">
      <Icon name={!online ? "wifi-off" : s.tone === "ok" ? "check-circle" : "refresh"} size={15} className={s.tone === "busy" ? "spin" : undefined} />
      {!compact && <span>{s.text}</span>}
    </button>
  );
}
