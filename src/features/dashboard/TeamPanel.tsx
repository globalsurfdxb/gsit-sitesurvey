"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { IconTile } from "@/components/ui/Pickers";
import { ago, initialsOf, statsFor } from "@/features/departments/stats";
import type { LocalSurvey } from "@/lib/local-db";
import type { DepartmentInfo } from "@/lib/types";

const SHOWN = 6;

/** A team lead's view of their department: totals and each member's activity, one tap from the details. */
export function TeamPanel({ dept, selfId, surveys }: { dept: DepartmentInfo; selfId: string; surveys: LocalSurvey[] }) {
  const others = (dept.members ?? []).filter((m) => m.id !== selfId);
  return (
    <section className="card team-panel" aria-label={`${dept.name} team`}>
      <div className="team-panel-head">
        <IconTile icon={dept.iconName} tone={dept.tone} />
        <div className="team-panel-title">
          <strong>Your team · {dept.name}</strong>
          <span className="muted small">{others.length === 0 ? "No members yet" : `${others.length} ${others.length === 1 ? "member" : "members"}`}</span>
        </div>
        <Link href={`/department?id=${dept.id}`} className="link">Manage</Link>
      </div>

      <div className="team-panel-stats">
        <div><strong>{dept.stats.draft}</strong><span>In progress</span></div>
        <div><strong>{dept.stats.submitted}</strong><span>Submitted</span></div>
        <div><strong>{dept.stats.total}</strong><span>All surveys</span></div>
      </div>

      {others.length > 0 && (
        <ul className="people flat">
          {others.slice(0, SHOWN).map((m) => {
            const st = statsFor(surveys, m.id, dept.id);
            return (
              <li key={m.id} className="person">
                <Link href={`/member?dept=${dept.id}&id=${m.id}`} className="person-link" aria-label={`Open ${m.name}`}>
                  <span className="avatar sm" aria-hidden>{initialsOf(m.name)}</span>
                  <span className="person-main">
                    <strong>{m.name}</strong>
                    <span className="muted small">{st.total === 0 ? "No surveys yet" : `${st.draft} in progress · ${st.submitted} submitted`} · {ago(st.lastActivity)}</span>
                  </span>
                  <Icon name="chevron-right" className="muted" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {others.length > SHOWN && <Link href={`/department?id=${dept.id}`} className="link team-more">View all {others.length} members</Link>}
      {others.length === 0 && (
        <Link href={`/department?id=${dept.id}`} className="btn secondary sm"><Icon name="user-plus" size={16} /> Add your first member</Link>
      )}
    </section>
  );
}
