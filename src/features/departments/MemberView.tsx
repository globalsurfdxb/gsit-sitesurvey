"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { useUi } from "@/components/ui/UiProvider";
import { useCatalog } from "@/features/catalog/useCatalog";
import { SurveyCard } from "@/features/surveys/SurveyCard";
import { useLocalSurveys } from "@/features/surveys/useSurveys";
import { canManageDepartment, isSuperAdmin } from "@/lib/access";
import { ApiError, api } from "@/lib/sync";
import { generatePassword } from "./MemberSheet";
import { ago, initialsOf, statsFor } from "./stats";

/** One team member as their lead (or a super admin) sees them: details, activity and every survey they own. */
export function MemberView() {
  const params = useSearchParams();
  const deptId = params.get("dept") ?? undefined;
  const memberId = params.get("id") ?? undefined;
  const router = useRouter();
  const { user, online, reloadCatalog } = useApp();
  const { confirm, toast } = useUi();
  const catalog = useCatalog();
  const groups = useLocalSurveys();
  const [resetOpen, setResetOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  const dept = catalog.department(deptId);
  const member = dept?.members?.find((m) => m.id === memberId);
  if (!user || !catalog.loaded) return <div className="skeleton h-card" />;
  if (!dept || !member || !canManageDepartment(user, dept.id))
    return (
      <div className="center">
        <p>This person isn’t available to you.</p>
        <Link href={deptId ? `/department?id=${deptId}` : "/"} className="btn primary">Back</Link>
      </div>
    );

  const admin = isSuperAdmin(user);
  const theirs = (groups?.all ?? []).filter((s) => s.ownerId === member.id && (s.departmentId ?? "elv") === dept.id);
  const st = statsFor(theirs, member.id, dept.id);

  async function remove() {
    if (!member || !dept) return;
    if (!(await confirm({ title: `Remove ${member.name}?`, message: `${member.name} loses access to ${dept.name}. Their surveys stay in the department.`, confirmLabel: "Remove", danger: true }))) return;
    try {
      await api(`/api/departments/${dept.id}/members/${member.id}`, { method: "DELETE" });
      await reloadCatalog();
      toast(`${member.name} removed`, "success");
      router.replace(`/department?id=${dept.id}`);
    } catch (e) {
      toast(e instanceof ApiError ? String(e.body.error) : "Couldn’t remove. Check your connection.", "error");
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    if (!member || !dept) return;
    setBusy(true);
    try {
      await api(`/api/departments/${dept.id}/members/${member.id}`, { method: "PATCH", body: JSON.stringify({ password: pw }) });
      toast("Password changed. Share the new one with them.", "success");
      setResetOpen(false);
      setPw("");
    } catch (err) {
      toast(err instanceof ApiError ? String((err.body.issues as string[] | undefined)?.[0] ?? err.body.error) : "Couldn’t change it. Check your connection.", "error");
    }
    setBusy(false);
  }

  return (
    <div className="stack gap-lg">
      <Link href={`/department?id=${dept.id}`} className="page-back"><Icon name="arrow-left" size={18} /> {dept.name} team</Link>

      <section className="card profile">
        <div className="avatar" aria-hidden>{initialsOf(member.name)}</div>
        <div className="profile-main">
          <strong>{member.name}</strong>
          <a className="link" href={`mailto:${member.email}`}>{member.email}</a>
          <span className="muted small">{member.role === "lead" ? "Team lead" : "Member"} of {dept.name}{member.joinedAt ? ` · account since ${new Date(member.joinedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}` : ""}</span>
        </div>
        {member.role === "lead" && <span className="tag blue">Team lead</span>}
      </section>

      <section className="stats-row four" aria-label="Activity">
        <div className="stat"><strong>{st.total}</strong><span>Surveys</span></div>
        <div className="stat blue"><strong>{st.draft}</strong><span>In progress</span></div>
        <div className="stat green"><strong>{st.submitted}</strong><span>Submitted</span></div>
        <div className="stat"><strong className="stat-sm">{ago(st.lastActivity)}</strong><span>Last activity</span></div>
      </section>

      <section>
        <div className="section-head"><h2 className="section-title">Surveys</h2></div>
        {theirs.length === 0 ? (
          <div className="card empty-state"><Icon name="clipboard" size={28} /><strong>No surveys yet</strong><span className="muted small">Surveys {member.name.split(" ")[0]} starts will appear here once synced.</span></div>
        ) : (
          <ul className="list">
            {theirs.map((s) => (
              <SurveyCard key={s.id} survey={s} form={catalog.formFor(s.formId)} />
            ))}
          </ul>
        )}
        <p className="hint">You can open and review these. Only {member.name.split(" ")[0]} can edit them.</p>
      </section>

      {(admin || member.role !== "lead") && (
        <section className="card settings">
          <h2 className="section-title">Manage</h2>
          {admin && (
            <div className="setting-row">
              <div><strong>Reset password</strong><span className="muted small">Set a new temporary password for this account</span></div>
              <button className="btn secondary sm" onClick={() => { setPw(generatePassword()); setResetOpen(true); }} disabled={!online}>Reset</button>
            </div>
          )}
          <div className="setting-row">
            <div><strong>Remove from {dept.name}</strong><span className="muted small">Their surveys stay in the department</span></div>
            <button className="btn danger-outline sm" onClick={remove} disabled={!online}>Remove</button>
          </div>
        </section>
      )}

      <Sheet open={resetOpen} onClose={() => setResetOpen(false)} title={`Reset password for ${member.name}`} footer={<button className="btn primary block" type="submit" form="reset-pw">Set password</button>}>
        <form id="reset-pw" onSubmit={reset} className="stack">
          <label className="field">
            <span className="field-label">New temporary password</span>
            <div className="row-end full">
              <input className="input mono" required minLength={10} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="off" spellCheck={false} />
              <button type="button" className="btn secondary sm" onClick={() => setPw(generatePassword())}><Icon name="refresh" size={16} /> Generate</button>
            </div>
          </label>
          <p className="hint">Copy it before you save. It isn’t shown again.</p>
          <button type="submit" hidden disabled={busy} />
        </form>
      </Sheet>
    </div>
  );
}
