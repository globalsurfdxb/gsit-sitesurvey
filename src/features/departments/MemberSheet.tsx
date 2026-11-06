"use client";

import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useUi } from "@/components/ui/UiProvider";
import { isSuperAdmin } from "@/lib/access";
import { ApiError, api } from "@/lib/sync";
import type { DepartmentInfo } from "@/lib/types";

const FORM = "member-form";

/** A readable temporary password: 14 characters, no look-alikes. */
export function generatePassword() {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function AddForm({ dept, onDone }: { dept: DepartmentInfo; onDone: () => void }) {
  const { user, reloadCatalog } = useApp();
  const { toast } = useUi();
  const [v, setV] = useState({ email: "", role: "member" as "member" | "lead", name: "", password: "" });
  const [needsAccount, setNeedsAccount] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = { email: v.email, role: v.role, ...(needsAccount ? { name: v.name, password: v.password } : {}) };
      const r = await api<{ created: boolean }>(`/api/departments/${dept.id}/members`, { method: "POST", body: JSON.stringify(body) });
      await reloadCatalog();
      toast(r.created ? `Account created for ${v.email}. Share the temporary password with them.` : `${v.email} added to ${dept.name}`, "success");
      onDone();
    } catch (err) {
      if (err instanceof ApiError && err.body.code === "needs-account") {
        setNeedsAccount(true);
        setError("");
      } else {
        setError(err instanceof ApiError ? String(err.body.issues ? (err.body.issues as string[])[0] : err.body.error) : "You need a connection to do this.");
      }
      setBusy(false);
    }
  }

  return (
    <form id={FORM} onSubmit={submit} className="stack">
      <label className="field">
        <span className="field-label">Email <span className="req">*</span></span>
        <input className="input" type="email" required value={v.email} onChange={(e) => { setV({ ...v, email: e.target.value }); setNeedsAccount(false); }} placeholder="name@globalsurf.ae" autoFocus autoComplete="off" />
      </label>

      {user && isSuperAdmin(user) && (
        <div className="field">
          <span className="field-label">Role in {dept.name}</span>
          <div className="seg wide" role="radiogroup" aria-label="Role">
            {(["member", "lead"] as const).map((r) => (
              <button key={r} type="button" role="radio" aria-checked={v.role === r} className={`seg-btn${v.role === r ? " on neutral" : ""}`} onClick={() => setV({ ...v, role: r })}>
                {r === "lead" ? "Team lead" : "Member"}
              </button>
            ))}
          </div>
          {v.role === "lead" && dept.leadName && <p className="hint">{dept.leadName} becomes a regular member.</p>}
        </div>
      )}

      {needsAccount && (
        <div className="card-sub">
          <div className="card-sub-head">
            <strong>No account for that email yet</strong>
          </div>
          <p className="muted small">Create one now. They can sign in right away with the temporary password.</p>
          <label className="field">
            <span className="field-label">Full name <span className="req">*</span></span>
            <input className="input" required minLength={2} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} autoComplete="off" />
          </label>
          <label className="field">
            <span className="field-label">Temporary password <span className="req">*</span></span>
            <div className="row-end full">
              <input className="input mono" required minLength={10} value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} autoComplete="off" spellCheck={false} />
              <button type="button" className="btn secondary sm" onClick={() => setV({ ...v, password: generatePassword() })}>
                <Icon name="refresh" size={16} /> Generate
              </button>
            </div>
          </label>
        </div>
      )}
      {error && <div className="error" role="alert">{error}</div>}
      <button type="submit" hidden disabled={busy} />
    </form>
  );
}

export function MemberSheet({ open, onClose, dept }: { open: boolean; onClose: () => void; dept: DepartmentInfo }) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`Add to ${dept.name}`}
      footer={
        <button className="btn primary block" type="submit" form={FORM}>
          <Icon name="user-plus" size={18} /> Add person
        </button>
      }
    >
      {open && <AddForm dept={dept} onDone={onClose} />}
    </Sheet>
  );
}
