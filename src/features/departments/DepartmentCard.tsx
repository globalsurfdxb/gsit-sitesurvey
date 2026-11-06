"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { IconTile } from "@/components/ui/Pickers";
import type { DepartmentInfo } from "@/lib/types";

/** Summary tile for one department: lead, people, forms, surveys. */
export function DepartmentCard({ dept, forms, showStats }: { dept: DepartmentInfo; forms: number; showStats: boolean }) {
  return (
    <li>
      <Link href={`/department?id=${dept.id}`} className="card dept-card">
        <div className="dept-card-head">
          <IconTile icon={dept.iconName} tone={dept.tone} large />
          <div className="dept-card-title">
            <strong>{dept.name}</strong>
            <span className="muted small ellipsis">{dept.description || "No description"}</span>
          </div>
          <Icon name="chevron-right" className="muted" />
        </div>
        <div className="dept-card-lead small">
          <Icon name="star" size={14} />
          {dept.leadName ? <span>Lead: <strong>{dept.leadName}</strong></span> : <span className="muted">No team lead yet</span>}
        </div>
        <div className="dept-card-stats">
          <span><strong>{dept.memberCount}</strong> <small className="muted">{dept.memberCount === 1 ? "person" : "people"}</small></span>
          <span><strong>{forms}</strong> <small className="muted">{forms === 1 ? "form" : "forms"}</small></span>
          {showStats && (
            <>
              <span><strong>{dept.stats.draft}</strong> <small className="muted">in progress</small></span>
              <span><strong>{dept.stats.submitted}</strong> <small className="muted">submitted</small></span>
            </>
          )}
        </div>
      </Link>
    </li>
  );
}
