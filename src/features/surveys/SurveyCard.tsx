"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SectionIcon } from "@/features/editor/SectionIcon";
import type { LocalSurvey } from "@/lib/local-db";
import { sectionsInScope, surveyProgress, surveySubtitle, surveyTitle } from "@/lib/survey";
import type { FormSchema } from "@/lib/types";

const when = (t: number) => {
  const d = new Date(t);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay ? `Today, ${d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}` : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

interface Props {
  survey: LocalSurvey;
  /** The survey's form (undefined while it isn't on this device yet). */
  form: FormSchema | undefined;
  onDelete?: (s: LocalSurvey) => void;
  /** Show who owns it (team views). */
  showOwner?: boolean;
  /** Show the department tag (people who work across departments). */
  department?: string;
}

export function SurveyCard({ survey: s, form, onDelete, showOwner, department }: Props) {
  const p = surveyProgress(form, s.values);
  const systems = form ? sectionsInScope(form, s.values).filter((x) => (x.scope ?? "always") !== "always" && !x.support) : [];
  const sync = s.rejected ? { cls: "bad", text: "Not accepted" } : s.conflict ? { cls: "bad", text: "Conflict" } : s.dirty ? { cls: "warn", text: "Not synced" } : { cls: "ok", text: "Synced" };

  return (
    <li className="card survey-card">
      <Link href={`/survey?id=${s.id}`} className="survey-card-link">
        <ProgressRing pct={p.pct} label={`${p.done}/${p.total} required fields`} />
        <div className="survey-card-main">
          <strong>{surveyTitle(form, s.values)}</strong>
          <span className="muted small ellipsis">{surveySubtitle(form, s.values) || "No site address yet"}</span>
          <div className="survey-card-meta">
            <span className={`tag ${s.status}`}>{s.status}</span>
            <span className={`tag ${sync.cls}`}>{sync.text}</span>
            {department && <span className="tag blue">{department}</span>}
            <span className="muted small">{when(s.updatedAt)}{showOwner && s.ownerName ? ` · ${s.ownerName}` : ""}</span>
          </div>
          {systems.length > 0 && (
            <div className="survey-card-systems" aria-label={`Sections: ${systems.map((x) => x.title).join(", ")}`}>
              {systems.map((x) => (
                <span key={x.key} title={x.title}><SectionIcon section={x} size={14} /></span>
              ))}
            </div>
          )}
        </div>
        <Icon name="chevron-right" className="muted" />
      </Link>
      {onDelete && (
        <button className="icon-btn danger" onClick={() => onDelete(s)} aria-label={`Delete ${surveyTitle(form, s.values)}`}>
          <Icon name="trash" size={18} />
        </button>
      )}
    </li>
  );
}
