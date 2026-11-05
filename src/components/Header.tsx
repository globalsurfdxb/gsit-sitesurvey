"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useApp } from "./AppProvider";
import { syncLabel } from "./ui";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
}

export function Header() {
  const pathname = usePathname();
  const { user, online, status, pending, requestSync, logout } = useApp();
  const [installEvt, setInstallEvt] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  if (pathname === "/login") return null;
  const sync = syncLabel(status, online, pending);

  return (
    <header className="app-header">
      <Link href="/" className="logo" aria-label="Surveys home">
        GS IT
      </Link>
      <div className="app-title">
        <strong>ELV Site Survey</strong>
        <small>{user ? user.name : "Field capture"}</small>
      </div>
      <button className={`sync-chip ${sync.tone}`} onClick={() => requestSync(true)} title="Tap to sync now" aria-label={`Sync status: ${sync.text}. Tap to sync now.`}>
        <i aria-hidden />
        {sync.text}
      </button>
      {installEvt && (
        <button
          className="btn ghost sm"
          onClick={async () => {
            await installEvt.prompt();
            setInstallEvt(null);
          }}
        >
          Install
        </button>
      )}
      {user && (
        <button className="btn ghost sm" onClick={logout}>
          Sign out
        </button>
      )}
    </header>
  );
}
