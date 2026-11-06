"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Icon } from "@/components/ui/Icon";
import { useCatalog } from "@/features/catalog/useCatalog";
import { DepartmentCard } from "@/features/departments/DepartmentCard";
import { DepartmentSheet } from "@/features/departments/DepartmentSheet";
import { SurveyCard } from "@/features/surveys/SurveyCard";
import { useLocalSurveys } from "@/features/surveys/useSurveys";

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

/** Super admin home: every department at a glance, plus the latest activity across the company. */
export function AdminDashboard() {
  const { user, online } = useApp();
  const catalog = useCatalog();
  const groups = useLocalSurveys();
  const [creating, setCreating] = useState(false);

  if (!catalog.loaded || groups === null) {
    return (
      <div className="stack">
        <div className="skeleton h-title" />
        <div className="skeleton h-card" />
        <div className="skeleton h-card" />
      </div>
    );
  }

  const depts = catalog.departments;
  const total = depts.reduce((n, d) => ({ people: n.people + d.memberCount, draft: n.draft + d.stats.draft, submitted: n.submitted + d.stats.submitted }), { people: 0, draft: 0, submitted: 0 });
  const first = user?.name.split(" ")[0];

  return (
    <div className="stack gap-lg">
      <section className="page-head">
        <div>
          <h1 className="page-title">{greeting()}{first ? `, ${first}` : ""}</h1>
          <p className="muted">Company overview across {depts.length} {depts.length === 1 ? "department" : "departments"}.</p>
        </div>
        <button className="btn primary" onClick={() => setCreating(true)} disabled={!online} title={online ? undefined : "Needs a connection"}>
          <Icon name="plus" size={18} /> <span className="desktop-inline">New department</span>
        </button>
      </section>

      <section className="stats-row four" aria-label="Summary">
        <div className="stat"><strong>{depts.length}</strong><span>Departments</span></div>
        <div className="stat blue"><strong>{total.people}</strong><span>People</span></div>
        <div className="stat amber"><strong>{total.draft}</strong><span>In progress</span></div>
        <div className="stat green"><strong>{total.submitted}</strong><span>Submitted</span></div>
      </section>

      <section>
        <div className="section-head">
          <h2 className="section-title">Departments</h2>
          <Link href="/forms" className="link">Manage forms</Link>
        </div>
        {depts.length === 0 ? (
          <div className="card empty-state"><Icon name="building" size={28} /><strong>No departments yet</strong><span className="muted small">Create the first one with the button above.</span></div>
        ) : (
          <ul className="dept-grid">
            {depts.map((d) => (
              <DepartmentCard key={d.id} dept={d} forms={catalog.forms.filter((f) => f.departmentId === d.id && f.status === "active").length} showStats />
            ))}
          </ul>
        )}
      </section>

      {groups.all.length > 0 && (
        <section>
          <div className="section-head">
            <h2 className="section-title">Latest activity</h2>
            <Link href="/surveys" className="link">All surveys</Link>
          </div>
          <ul className="list">
            {groups.all.slice(0, 5).map((s) => (
              <SurveyCard key={s.id} survey={s} form={catalog.formFor(s.formId)} showOwner department={catalog.department(s.departmentId ?? "elv")?.code} />
            ))}
          </ul>
        </section>
      )}

      <DepartmentSheet open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
