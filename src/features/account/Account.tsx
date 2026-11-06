"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useApp } from "@/components/AppProvider";
import { useInstallPrompt } from "@/components/PwaRegister";
import { syncLabel } from "@/components/shell/SyncChip";
import { Icon } from "@/components/ui/Icon";
import { useUi } from "@/components/ui/UiProvider";
import { useCatalog } from "@/features/catalog/useCatalog";
import { roleLabel } from "@/lib/access";
import { formatBytes } from "@/lib/files";

type Theme = "system" | "light" | "dark";
const THEME_EVT = "gs-theme-change";

function readTheme(): Theme {
  try {
    const t = localStorage.getItem("gs_theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(
    (cb) => {
      window.addEventListener(THEME_EVT, cb);
      return () => window.removeEventListener(THEME_EVT, cb);
    },
    readTheme,
    () => "system" as Theme,
  );
  const set = (t: Theme) => {
    try {
      if (t === "system") localStorage.removeItem("gs_theme");
      else localStorage.setItem("gs_theme", t);
    } catch {
      /* private mode: theme just won't persist */
    }
    if (t === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = t;
    window.dispatchEvent(new Event(THEME_EVT));
  };
  return [theme, set];
}

function useStorageUsage() {
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null);
  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setUsage({ used: e.usage ?? 0, quota: e.quota ?? 0 }));
  }, []);
  return usage;
}

export function Account() {
  const { user, online, status, pending, lastSync, requestSync, logout } = useApp();
  const { confirm, toast } = useUi();
  const [theme, setTheme] = useTheme();
  const install = useInstallPrompt();
  const storage = useStorageUsage();
  const catalog = useCatalog();
  const sync = syncLabel(status, online, pending);
  const initials = (user?.name ?? "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  async function signOut() {
    const msg = pending > 0 ? `${pending} change${pending === 1 ? " is" : "s are"} not synced yet. They stay on this device and will upload when you sign in again.` : "You can sign back in any time.";
    if (await confirm({ title: "Sign out?", message: msg, confirmLabel: "Sign out" })) await logout();
  }

  return (
    <div className="stack gap-lg">
      <h1 className="page-title">Account</h1>

      <section className="card profile">
        <div className="avatar" aria-hidden>{initials}</div>
        <div className="profile-main">
          <strong>{user?.name ?? "Not signed in"}</strong>
          <span className="muted small">{user?.email}</span>
        </div>
        {user && <span className="tag blue">{roleLabel(user)}</span>}
      </section>

      {user && user.role !== "super_admin" && (
        <section className="card settings">
          <h2 className="section-title">Departments</h2>
          {user.memberships.length === 0 ? (
            <p className="muted small">You haven’t been added to a department yet.</p>
          ) : (
            user.memberships.map((m) => (
              <div className="setting-row" key={m.departmentId}>
                <div>
                  <strong>{catalog.department(m.departmentId)?.name ?? m.departmentId.toUpperCase()}</strong>
                  <span className="muted small">{m.role === "lead" ? "Team lead" : "Member"}</span>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      <section className="card settings">
        <h2 className="section-title">Sync</h2>
        <div className="setting-row">
          <div>
            <strong>{sync.text}</strong>
            <span className="muted small">{lastSync ? `Last synced ${new Date(lastSync).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : "Not synced in this session yet"}</span>
          </div>
          <button className="btn secondary sm" onClick={() => { requestSync(true); toast("Syncing…"); }} disabled={!online}>
            <Icon name="refresh" size={16} /> Sync now
          </button>
        </div>
      </section>

      <section className="card settings">
        <h2 className="section-title">Appearance</h2>
        <div className="seg wide" role="radiogroup" aria-label="Theme">
          {(["system", "light", "dark"] as const).map((t) => (
            <button key={t} role="radio" aria-checked={theme === t} className={`seg-btn${theme === t ? " on neutral" : ""}`} onClick={() => setTheme(t)}>
              <Icon name={t === "dark" ? "moon" : "sun"} size={16} /> {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </section>

      <section className="card settings">
        <h2 className="section-title">This device</h2>
        <div className="setting-row">
          <div>
            <strong>Offline storage</strong>
            <span className="muted small">{storage ? `${formatBytes(storage.used)} used` : "Survey data and photos are kept here"}</span>
          </div>
        </div>
        {install.available && (
          <div className="setting-row">
            <div>
              <strong>Install the app</strong>
              <span className="muted small">Add it to your home screen for one-tap access</span>
            </div>
            <button className="btn secondary sm" onClick={install.install}>
              <Icon name="download" size={16} /> Install
            </button>
          </div>
        )}
      </section>

      <button className="btn danger-outline block" onClick={signOut} disabled={!user}>
        <Icon name="log-out" size={18} /> Sign out
      </button>
      <p className="muted small center-text">Global Surf IT · Site Survey</p>
    </div>
  );
}
