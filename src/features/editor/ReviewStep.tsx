"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { sectionsInScope, sectionStats, surveyProgress } from "@/lib/survey";
import type { FormSchema, SurveyStatus, Values } from "@/lib/types";
import { SectionIcon } from "./SectionIcon";

/** Last step: how complete is the survey, what's missing, and where to fix it. */
export function ReviewStep({ id, form, values, status, onGo }: { id: string; form: FormSchema; values: Values; status: SurveyStatus; onGo: (sectionKey: string) => void }) {
  const progress = surveyProgress(form, values);
  const sections = sectionsInScope(form, values);
  const bySection = new Map<string, typeof progress.missing>();
  for (const m of progress.missing) bySection.set(m.sectionKey, [...(bySection.get(m.sectionKey) ?? []), m]);

  return (
    <div className="stack gap-lg">
      <section className="card review-hero">
        <ProgressRing pct={progress.pct} size={72} />
        <div>
          <h2>{progress.missing.length === 0 ? "Ready to submit" : `${progress.missing.length} required field${progress.missing.length === 1 ? "" : "s"} left`}</h2>
          <p className="muted small">{progress.done} of {progress.total} required fields complete{status === "submitted" ? " · already submitted" : ""}</p>
        </div>
      </section>

      {progress.missing.length > 0 && (
        <section className="card">
          <h3 className="group-title">Still to fill in</h3>
          <ul className="missing-list">
            {[...bySection.entries()].map(([key, items]) => (
              <li key={key}>
                <button className="missing-row" onClick={() => onGo(key)}>
                  <Icon name="alert" size={18} className="warn-ic" />
                  <span>
                    <strong>{items[0].section}</strong>
                    <small className="muted">{items.map((i) => i.label).join(" · ")}</small>
                  </span>
                  <Icon name="chevron-right" size={18} className="muted" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h3 className="group-title">Sections</h3>
        <ul className="review-list">
          {sections.map((s) => {
            const st = sectionStats(s, values);
            const ratio = st.total ? Math.round((st.answered / st.total) * 100) : 0;
            const miss = st.requiredTotal - st.requiredDone;
            return (
              <li key={s.key}>
                <button className="review-row" onClick={() => onGo(s.key)}>
                  <span className={`sec-icon tone-${s.tone}`}><SectionIcon section={s} size={18} /></span>
                  <span className="review-row-main">
                    <strong>{s.title}</strong>
                    <span className="bar" aria-hidden><i style={{ width: `${ratio}%` }} /></span>
                  </span>
                  <span className="review-row-meta">
                    {miss > 0 ? <span className="tag warn">{miss} required</span> : <span className="muted small">{st.answered}/{st.total}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <Link href={`/report?id=${id}`} className="btn secondary block">
        <Icon name="file" size={18} /> Preview report
      </Link>
    </div>
  );
}
