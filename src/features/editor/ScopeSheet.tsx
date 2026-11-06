"use client";

import { Sheet } from "@/components/ui/Sheet";
import { isSkipped, optionalSections, sectionStats } from "@/lib/survey";
import type { FormSchema, Values } from "@/lib/types";
import { SectionIcon } from "./SectionIcon";

/** Choose which systems this survey covers. Turning one off hides it but keeps its answers. */
export function ScopeSheet({ open, onClose, form, values, onToggle }: { open: boolean; onClose: () => void; form: FormSchema; values: Values; onToggle: (key: string) => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Survey scope" footer={<button className="btn primary block" onClick={onClose}>Done</button>}>
      <p className="muted small scope-intro">Turn off systems that don’t apply at this site. Their steps disappear and don’t count toward progress. Anything already entered is kept.</p>
      <ul className="scope-list">
        {optionalSections(form).map((s) => {
          const on = !isSkipped(values, s.key);
          const st = sectionStats(s, values);
          return (
            <li key={s.key}>
              <label className="scope-row">
                <span className={`sec-icon tone-${s.tone}`}><SectionIcon section={s} size={20} /></span>
                <span className="scope-row-main">
                  <strong>{s.title}</strong>
                  <small className="muted">{st.answered > 0 ? `${st.answered} answered` : s.subtitle}</small>
                </span>
                <span className="switch">
                  <input type="checkbox" checked={on} onChange={() => onToggle(s.key)} aria-label={`Include ${s.title}`} />
                  <span className="switch-track" aria-hidden />
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}
