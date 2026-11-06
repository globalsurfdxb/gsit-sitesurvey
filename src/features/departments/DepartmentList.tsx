"use client";

import { useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Icon } from "@/components/ui/Icon";
import { useCatalog } from "@/features/catalog/useCatalog";
import { canManageDepartment, isSuperAdmin } from "@/lib/access";
import { DepartmentCard } from "./DepartmentCard";
import { DepartmentSheet } from "./DepartmentSheet";

/** All departments (super admin) or the ones this person leads (team lead). */
export function DepartmentList() {
  const { user, online } = useApp();
  const catalog = useCatalog();
  const [creating, setCreating] = useState(false);
  const admin = !!user && isSuperAdmin(user);
  const visible = catalog.departments.filter((d) => user && canManageDepartment(user, d.id));

  if (!user || !catalog.loaded) return <div className="skeleton h-card" />;

  return (
    <div className="stack gap-lg">
      <div className="page-head">
        <div>
          <h1 className="page-title">{admin ? "Departments" : "Your teams"}</h1>
          <p className="muted">{admin ? "Each department has its own team lead, members and survey forms." : "Departments you lead."}</p>
        </div>
        {admin && (
          <button className="btn primary" onClick={() => setCreating(true)} disabled={!online} title={online ? undefined : "Needs a connection"}>
            <Icon name="plus" size={18} /> <span className="desktop-inline">New department</span>
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="card empty-state">
          <Icon name="building" size={28} />
          <strong>No departments to show</strong>
          <span className="muted small">{admin ? "Create the first one with the button above." : "You don’t lead a department yet."}</span>
        </div>
      ) : (
        <ul className="dept-grid">
          {visible.map((d) => (
            <DepartmentCard key={d.id} dept={d} forms={catalog.forms.filter((f) => f.departmentId === d.id && f.status === "active").length} showStats />
          ))}
        </ul>
      )}

      <DepartmentSheet open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
