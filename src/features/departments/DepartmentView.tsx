"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Icon } from "@/components/ui/Icon";
import { IconTile } from "@/components/ui/Pickers";
import { useUi } from "@/components/ui/UiProvider";
import { useCatalog } from "@/features/catalog/useCatalog";
import { NewFormSheet } from "@/features/forms/NewFormSheet";
import { SurveyCard } from "@/features/surveys/SurveyCard";
import { useLocalSurveys } from "@/features/surveys/useSurveys";
import { canManageDepartment, isSuperAdmin } from "@/lib/access";
import { ApiError, api } from "@/lib/sync";
import type { TeamMember } from "@/lib/types";
import { DepartmentSheet } from "./DepartmentSheet";
import { MemberSheet } from "./MemberSheet";
import { ago, initialsOf, statsFor } from "./stats";

export function DepartmentView() {
  const id = useSearchParams().get("id") ?? undefined;
  const router = useRouter();
  const { user, online, reloadCatalog } = useApp();
  const { confirm, toast, openNewSurvey } = useUi();
  const catalog = useCatalog();
  const groups = useLocalSurveys();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newForm, setNewForm] = useState(false);

  const dept = catalog.department(id);
  if (!user || !catalog.loaded) return <div className="skeleton h-card" />;
  if (!dept)
    return (
      <div className="center">
        <p>This department isn’t available to you.</p>
        <Link href="/" className="btn primary">Back home</Link>
      </div>
    );

  const manage = canManageDepartment(user, dept.id);
  const admin = isSuperAdmin(user);
  const forms = catalog.forms.filter((f) => f.departmentId === dept.id);
  const team = dept.members ?? [];
  const deptSurveys = (groups?.all ?? []).filter((s) => (s.departmentId ?? "elv") === dept.id);

  async function act(label: string, fn: () => Promise<unknown>, done: string) {
    try {
      await fn();
      await reloadCatalog();
      toast(done, "success");
    } catch (e) {
      toast(e instanceof ApiError ? String(e.body.error) : `Couldn’t ${label}. Check your connection.`, "error");
    }
  }

  const makeLead = async (m: TeamMember) => {
    if (await confirm({ title: `Make ${m.name} the team lead?`, message: `${dept!.leadName && dept!.leadId !== m.id ? `${dept!.leadName} becomes a regular member. ` : ""}${m.name} will see this department’s members and surveys.`, confirmLabel: "Make lead" })) {
      await act("change the lead", () => api(`/api/departments/${dept!.id}/members/${m.id}`, { method: "PATCH", body: JSON.stringify({ role: "lead" }) }), `${m.name} is now the team lead`);
    }
  };
  const removeMember = async (m: TeamMember) => {
    if (await confirm({ title: `Remove ${m.name}?`, message: `${m.name} loses access to ${dept!.name}. Their surveys stay in the department.`, confirmLabel: "Remove", danger: true })) {
      await act("remove them", () => api(`/api/departments/${dept!.id}/members/${m.id}`, { method: "DELETE" }), `${m.name} removed`);
    }
  };
  const deleteDepartment = async () => {
    if (await confirm({ title: `Delete ${dept.name}?`, message: "Its forms are deleted and members are detached. This only works if the department has no surveys.", confirmLabel: "Delete", danger: true })) {
      try {
        await api(`/api/departments/${dept.id}`, { method: "DELETE" });
        await reloadCatalog();
        toast(`${dept.name} deleted`, "success");
        router.replace("/departments");
      } catch (e) {
        toast(e instanceof ApiError ? String(e.body.error) : "Couldn’t delete. Check your connection.", "error");
      }
    }
  };

  return (
    <div className="stack gap-lg">
      <div className="dept-head">
        <IconTile icon={dept.iconName} tone={dept.tone} large size={26} />
        <div className="dept-head-main">
          <h1 className="page-title">{dept.name} <span className="tag blue">{dept.code}</span></h1>
          <p className="muted">{dept.description || "No description"}</p>
          <p className="small dept-lead">
            <Icon name="star" size={14} />
            {dept.leadName ? <><span className="nowrap">Team lead: <strong>{dept.leadName}</strong></span>{dept.leadEmail && <> <span className="nowrap lead-mail"><span className="sep">· </span><a className="link" href={`mailto:${dept.leadEmail}`}>{dept.leadEmail}</a></span></>}</> : <span className="muted">No team lead yet</span>}
          </p>
        </div>
        {admin && (
          <div className="dept-actions">
            <button className="btn secondary sm" onClick={() => setEditing(true)} disabled={!online}><Icon name="edit" size={16} /> Edit</button>
            <button className="icon-btn danger" onClick={deleteDepartment} disabled={!online} aria-label={`Delete ${dept.name}`}><Icon name="trash" size={18} /></button>
          </div>
        )}
      </div>

      {manage && (
        <section className="stats-row four" aria-label="Summary">
          <div className="stat blue"><strong>{dept.memberCount}</strong><span>People</span></div>
          <div className="stat"><strong>{dept.stats.draft}</strong><span>In progress</span></div>
          <div className="stat green"><strong>{dept.stats.submitted}</strong><span>Submitted</span></div>
          <div className="stat"><strong>{forms.filter((f) => f.status === "active").length}</strong><span>Active forms</span></div>
        </section>
      )}

      {manage && (
        <section>
          <div className="section-head">
            <h2 className="section-title">Team</h2>
            <button className="btn primary sm" onClick={() => setAdding(true)} disabled={!online} title={online ? undefined : "Needs a connection"}>
              <Icon name="user-plus" size={16} /> Add person
            </button>
          </div>
          {team.length === 0 ? (
            <div className="card empty-state"><Icon name="users" size={28} /><strong>No one here yet</strong><span className="muted small">Add the first member with the button above.</span></div>
          ) : (
            <ul className="card people">
              {team.map((m) => {
                const st = statsFor(groups?.all ?? [], m.id, dept.id);
                return (
                  <li key={m.id} className="person">
                    <Link href={`/member?dept=${dept.id}&id=${m.id}`} className="person-link" aria-label={`Open ${m.name}`}>
                      <span className="avatar sm" aria-hidden>{initialsOf(m.name)}</span>
                      <span className="person-main">
                        <strong>{m.name} {m.role === "lead" && <span className="tag blue">Team lead</span>}</strong>
                        <span className="muted small ellipsis">{m.email}</span>
                        <span className="muted small">{st.total === 0 ? "No surveys yet" : `${st.draft} in progress · ${st.submitted} submitted`} · {ago(st.lastActivity)}</span>
                      </span>
                      <Icon name="chevron-right" className="muted" />
                    </Link>
                    <div className="person-actions">
                      {admin && m.role !== "lead" && (
                        <button className="btn ghost sm" onClick={() => makeLead(m)} disabled={!online} aria-label={`Make ${m.name} the team lead`} title="Make team lead"><Icon name="star" size={14} /> <span className="btn-text">Make lead</span></button>
                      )}
                      {(m.role !== "lead" || admin) && (
                        <button className="icon-btn danger" onClick={() => removeMember(m)} disabled={!online} aria-label={`Remove ${m.name}`}><Icon name="x" size={18} /></button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      <section>
        <div className="section-head">
          <h2 className="section-title">Survey forms</h2>
          {manage && (
            <button className="btn secondary sm" onClick={() => setNewForm(true)} disabled={!online} title={online ? undefined : "Needs a connection"}>
              <Icon name="plus" size={16} /> New form
            </button>
          )}
        </div>
        {forms.length === 0 ? (
          <div className="card empty-state"><Icon name="layers" size={28} /><strong>No forms yet</strong><span className="muted small">{manage ? "Create the first form for this department." : "Your team lead hasn’t published a form yet."}</span></div>
        ) : (
          <ul className="list">
            {forms.map((f) => (
              <li key={f.id} className="card form-card">
                <div className="form-card-main">
                  <strong>{f.name}</strong>
                  <span className="muted small ellipsis">{f.description || `${f.schema.sections.length} sections`}</span>
                  <span className="survey-card-meta">
                    <span className={`tag ${f.status === "active" ? "ok" : "warn"}`}>{f.status === "active" ? "Active" : "Archived"}</span>
                    <span className="muted small">{f.schema.sections.length} sections · v{f.version}</span>
                  </span>
                </div>
                {f.status === "active" && (
                  <button className="btn secondary sm" onClick={() => openNewSurvey({ departmentId: dept.id, formId: f.id })} disabled={!canManageDepartment(user, dept.id) && !user.memberships.some((m) => m.departmentId === dept.id)}>
                    Start survey
                  </button>
                )}
                {manage && (
                  <Link href={`/form-builder?id=${f.id}`} className="icon-btn" aria-label={`Edit ${f.name}`}><Icon name="edit" size={18} /></Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {manage && deptSurveys.length > 0 && (
        <section>
          <div className="section-head"><h2 className="section-title">Recent surveys</h2></div>
          <ul className="list">
            {deptSurveys.slice(0, 5).map((s) => (
              <SurveyCard key={s.id} survey={s} form={catalog.formFor(s.formId)} showOwner />
            ))}
          </ul>
        </section>
      )}

      <DepartmentSheet open={editing} onClose={() => setEditing(false)} existing={dept} />
      <MemberSheet open={adding} onClose={() => setAdding(false)} dept={dept} />
      <NewFormSheet open={newForm} onClose={() => setNewForm(false)} departmentId={dept.id} />
    </div>
  );
}
