"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isManager, isSuperAdmin, ledDepartments } from "@/lib/access";
import { useApp } from "../AppProvider";
import { Logo } from "../brand/Logo";
import { Icon, type IconName } from "../ui/Icon";
import { useUi } from "../ui/UiProvider";
import { SyncChip } from "./SyncChip";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  /** Route prefixes that keep this item highlighted. */
  match: string[];
}

const isActive = (path: string, item: NavItem) => item.match.some((m) => (m === "/" ? path === "/" : path === m || path.startsWith(m + "/")));

/** Pages that take over the whole screen (the survey wizard, the report and the form builder). */
const FOCUS_ROUTES = ["/survey", "/report", "/form-builder"];

const initials = (name?: string) =>
  (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "?";

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { user } = useApp();
  const { openNewSurvey } = useUi();
  const focus = FOCUS_ROUTES.includes(path);

  if (focus) return <div className="shell focus">{children}</div>;

  const manager = !!user && isManager(user);
  const led = user ? ledDepartments(user) : [];
  const home: NavItem = { href: "/", label: "Home", icon: "home", match: ["/"] };
  const surveys: NavItem = { href: "/surveys", label: "Surveys", icon: "list", match: ["/surveys"] };
  // A lead of one department goes straight to their team; super admins and multi-department leads see the list.
  const team: NavItem = {
    href: user && !isSuperAdmin(user) && led.length === 1 ? `/department?id=${led[0]}` : "/departments",
    label: user && isSuperAdmin(user) ? "Departments" : "Team",
    icon: "users",
    match: ["/departments", "/department", "/member"],
  };
  const forms: NavItem = { href: "/forms", label: "Forms", icon: "layers", match: ["/forms"] };
  const account: NavItem = { href: "/account", label: "Account", icon: "user", match: ["/account"] };

  const side = manager ? [home, surveys, team, forms, account] : [home, surveys, account];
  const left = manager ? [home, team] : [home];
  const right = manager ? [surveys, forms] : [surveys];

  const tab = (n: NavItem) => (
    <Link key={n.href} href={n.href} className={isActive(path, n) ? "active" : ""} aria-current={isActive(path, n) ? "page" : undefined}>
      <Icon name={n.icon} />
      <span>{n.label}</span>
    </Link>
  );

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Home">
          <Logo height={26} />
          <span className="brand-divider" aria-hidden />
          <span className="brand-text">
            <strong>Site Survey</strong>
            <small>Global Surf IT</small>
          </span>
        </Link>
        <button className="btn primary block" onClick={() => openNewSurvey()} disabled={!user}>
          <Icon name="plus" size={18} /> New survey
        </button>
        <nav className="side-nav" aria-label="Main">
          {side.map((n) => (
            <Link key={n.href} href={n.href} className={isActive(path, n) ? "active" : ""} aria-current={isActive(path, n) ? "page" : undefined}>
              <Icon name={n.icon} /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          <SyncChip />
          {user && <small className="muted">{user.name}</small>}
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <Link href="/" className="brand" aria-label="Home">
            <Logo height={22} />
            <span className="brand-divider" aria-hidden />
            <strong className="brand-text">Site Survey</strong>
          </Link>
          <div className="topbar-end">
            <SyncChip />
            <Link href="/account" className={`avatar-btn${isActive(path, account) ? " active" : ""}`} aria-label="Account" aria-current={isActive(path, account) ? "page" : undefined}>
              {initials(user?.name)}
            </Link>
          </div>
        </header>
        <main className="page">{children}</main>
      </div>

      <nav className={`tabbar${manager ? " five" : ""}`} aria-label="Main">
        {left.map(tab)}
        <button className="tab-new" onClick={() => openNewSurvey()} disabled={!user} aria-label="New survey">
          <Icon name="plus" size={24} />
        </button>
        {right.map(tab)}
      </nav>
    </div>
  );
}
