"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { Icon } from "@/components/ui/Icon";
import { useUi } from "@/components/ui/UiProvider";
import { useCatalog } from "@/features/catalog/useCatalog";
import { isManager, isSuperAdmin } from "@/lib/access";
import { surveySubtitle, surveyTitle } from "@/lib/survey";
import { SurveyCard } from "./SurveyCard";
import { useLocalSurveys, useSurveyActions } from "./useSurveys";

type Filter = "all" | "draft" | "submitted";
type Who = "mine" | "team";

export function SurveyList() {
  const { user, status, lastSync, online } = useApp();
  const { openNewSurvey } = useUi();
  const groups = useLocalSurveys();
  const catalog = useCatalog();
  const { remove } = useSurveyActions();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [whoPick, setWho] = useState<Who | null>(null);

  const manager = !!user && isManager(user);
  // Super admins mostly review; leads mostly survey. Either can switch.
  const who: Who = !manager ? "mine" : (whoPick ?? (user && isSuperAdmin(user) ? "team" : "mine"));
  const surveys = groups ? (who === "mine" ? groups.mine : groups.team) : null;
  const multiDept = catalog.departments.length > 1;

  const firstPullPending = lastSync === null && online && (status === "idle" || status === "syncing");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (surveys ?? [])
      .filter((s) => filter === "all" || s.status === filter)
      .filter((s) => {
        if (!needle) return true;
        const form = catalog.formFor(s.formId);
        return `${surveyTitle(form, s.values)} ${surveySubtitle(form, s.values)} ${s.ownerName ?? ""}`.toLowerCase().includes(needle);
      });
  }, [surveys, q, filter, catalog]);

  const counts = {
    all: surveys?.length ?? 0,
    draft: surveys?.filter((s) => s.status === "draft").length ?? 0,
    submitted: surveys?.filter((s) => s.status === "submitted").length ?? 0,
  };

  return (
    <div className="stack gap-lg">
      <div className="page-head">
        <h1 className="page-title">Surveys</h1>
        <button className="btn primary desktop-only" onClick={() => openNewSurvey()} disabled={!user}>
          <Icon name="plus" size={18} /> New survey
        </button>
      </div>

      {manager && (
        <div className="seg wide" role="radiogroup" aria-label="Whose surveys">
          {(["mine", "team"] as const).map((w) => (
            <button key={w} role="radio" aria-checked={who === w} className={`seg-btn${who === w ? " on neutral" : ""}`} onClick={() => setWho(w)}>
              {w === "mine" ? "My surveys" : "Team surveys"} <span className="chip-count">{(w === "mine" ? groups?.mine : groups?.team)?.length ?? 0}</span>
            </button>
          ))}
        </div>
      )}

      <div className="search">
        <Icon name="search" size={18} />
        <input type="search" placeholder="Search reference, client, site or person" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search surveys" />
      </div>

      <div className="chips" role="tablist" aria-label="Filter surveys">
        {(["all", "draft", "submitted"] as const).map((f) => (
          <button key={f} role="tab" aria-selected={filter === f} className={`chip${filter === f ? " on" : ""}`} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "draft" ? "In progress" : "Submitted"} <span className="chip-count">{counts[f]}</span>
          </button>
        ))}
      </div>

      {surveys === null || (counts.all === 0 && firstPullPending) ? (
        <div className="stack">
          <div className="skeleton h-card" />
          <div className="skeleton h-card" />
          <div className="skeleton h-card" />
        </div>
      ) : rows.length === 0 ? (
        <div className="card empty-state">
          <Icon name={counts.all === 0 ? "clipboard" : "search"} size={28} />
          <strong>{counts.all === 0 ? (who === "team" ? "No team surveys yet" : "No surveys yet") : "Nothing matches"}</strong>
          <span className="muted small">
            {counts.all === 0 ? (who === "team" ? "Surveys your team starts will appear here." : "Start one with the + button.") : "Try a different search or filter."}
          </span>
        </div>
      ) : (
        <ul className="list">
          {rows.map((s) => (
            <SurveyCard
              key={s.id}
              survey={s}
              form={catalog.formFor(s.formId)}
              onDelete={who === "mine" || (user && isSuperAdmin(user)) ? remove : undefined}
              showOwner={who === "team"}
              department={multiDept ? catalog.department(s.departmentId ?? "elv")?.code : undefined}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
