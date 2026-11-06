"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Icon } from "@/components/ui/Icon";
import { IconTile } from "@/components/ui/Pickers";
import { useCatalog } from "@/features/catalog/useCatalog";
import { canManageDepartment } from "@/lib/access";
import { NewFormSheet } from "./NewFormSheet";

const fieldCount = (f: { schema: { sections: { blocks: { t: string }[] }[] } }) => f.schema.sections.reduce((n, s) => n + s.blocks.filter((b) => b.t !== "heading").length, 0);

/** Every form the person may customise, grouped by department. */
export function FormList() {
  const { user, online } = useApp();
  const catalog = useCatalog();
  const [creating, setCreating] = useState<string | null>(null);

  if (!user || !catalog.loaded) return <div className="skeleton h-card" />;
  const managed = catalog.departments.filter((d) => canManageDepartment(user, d.id));

  return (
    <div className="stack gap-lg">
      <div className="page-head">
        <div>
          <h1 className="page-title">Forms</h1>
          <p className="muted">Each department has its own survey forms. Add or change sections and fields here; engineers get the update on their next sync.</p>
        </div>
      </div>

      {managed.length === 0 ? (
        <div className="card empty-state"><Icon name="layers" size={28} /><strong>No forms to manage</strong><span className="muted small">Team leads and super admins manage forms for their departments.</span></div>
      ) : (
        managed.map((d) => {
          const forms = catalog.forms.filter((f) => f.departmentId === d.id);
          return (
            <section key={d.id} className="stack">
              <div className="section-head">
                <h2 className="section-title form-group-title"><IconTile icon={d.iconName} tone={d.tone} size={16} /> {d.name}</h2>
                <button className="btn secondary sm" onClick={() => setCreating(d.id)} disabled={!online} title={online ? undefined : "Needs a connection"}>
                  <Icon name="plus" size={16} /> New form
                </button>
              </div>
              {forms.length === 0 ? (
                <div className="card empty-state"><strong>No forms in {d.name} yet</strong><span className="muted small">Create one to let the team start surveys.</span></div>
              ) : (
                <ul className="list">
                  {forms.map((f) => (
                    <li key={f.id} className="card form-card">
                      <Link href={`/form-builder?id=${f.id}`} className="form-card-main form-card-link">
                        <strong>{f.name}</strong>
                        <span className="muted small ellipsis">{f.description || "No description"}</span>
                        <span className="survey-card-meta">
                          <span className={`tag ${f.status === "active" ? "ok" : "warn"}`}>{f.status === "active" ? "Active" : "Archived"}</span>
                          <span className="muted small">{f.schema.sections.length} sections · {fieldCount(f)} fields · v{f.version}</span>
                        </span>
                      </Link>
                      <Link href={`/form-builder?id=${f.id}`} className="btn secondary sm"><Icon name="edit" size={16} /> Edit</Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}

      <NewFormSheet open={creating !== null} onClose={() => setCreating(null)} departmentId={creating ?? undefined} />
    </div>
  );
}
