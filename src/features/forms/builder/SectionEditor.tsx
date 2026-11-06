"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { IconPicker, IconTile, TonePicker } from "@/components/ui/Pickers";
import type { BlockDef, SectionDef, SectionScope } from "@/lib/types";
import { FieldEditor } from "./FieldEditor";
import { cloneBlock, FIELD_KINDS, moveItem, newBlock, SCOPE_LABEL, type FieldKind } from "./model";

interface Props {
  section: SectionDef;
  index: number;
  count: number;
  open: boolean;
  onToggle: () => void;
  onChange: (next: SectionDef) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}

/** One section of the form: its look and scope, and an editable list of its fields. */
export function SectionEditor({ section, index, count, open, onToggle, onChange, onMove, onDelete }: Props) {
  const [palette, setPalette] = useState(false);
  const fieldCount = section.blocks.filter((b) => b.t !== "heading").length;
  const setBlocks = (blocks: BlockDef[]) => onChange({ ...section, blocks });

  const add = (kind: FieldKind | "heading") => {
    setBlocks([...section.blocks, kind === "heading" ? { t: "heading", text: "New group" } : newBlock(kind, section.key)]);
    setPalette(false);
  };

  return (
    <li className={`card se${open ? " open" : ""}`}>
      <div className="se-head">
        <button type="button" className="se-toggle" onClick={onToggle} aria-expanded={open} aria-label={`${open ? "Collapse" : "Expand"} section ${section.title}`}>
          <IconTile icon={section.iconName} tone={section.tone} />
          <span className="se-title">
            <strong>{section.title || "Untitled section"}</strong>
            <span className="muted small">{fieldCount} {fieldCount === 1 ? "field" : "fields"} · {SCOPE_LABEL[section.scope ?? "always"]}</span>
          </span>
          <Icon name={open ? "chevron-down" : "chevron-right"} className="muted" />
        </button>
        <div className="se-tools">
          <button type="button" className="icon-btn" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move section up"><Icon name="arrow-up" size={16} /></button>
          <button type="button" className="icon-btn" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move section down"><Icon name="arrow-down" size={16} /></button>
          <button type="button" className="icon-btn danger" onClick={onDelete} aria-label="Delete section"><Icon name="trash" size={16} /></button>
        </div>
      </div>

      {open && (
        <div className="se-body">
          <div className="grid2">
            <label className="field">
              <span className="field-label">Section title</span>
              <input className="input" value={section.title} onChange={(e) => onChange({ ...section, title: e.target.value })} />
            </label>
            <label className="field">
              <span className="field-label">Short name <span className="muted small">(step tab)</span></span>
              <input className="input" maxLength={24} value={section.short ?? ""} onChange={(e) => onChange({ ...section, short: e.target.value })} />
            </label>
          </div>
          <label className="field">
            <span className="field-label">Subtitle</span>
            <input className="input" value={section.subtitle} onChange={(e) => onChange({ ...section, subtitle: e.target.value })} placeholder="One line shown under the title" />
          </label>
          <label className="field">
            <span className="field-label">When is it part of a survey?</span>
            <select className="input" value={section.scope ?? "always"} onChange={(e) => onChange({ ...section, scope: e.target.value as SectionScope })}>
              {(Object.keys(SCOPE_LABEL) as SectionScope[]).map((s) => (
                <option key={s} value={s}>{SCOPE_LABEL[s]}</option>
              ))}
            </select>
            <span className="hint">Optional sections appear as switches when a survey starts, so engineers can leave out what doesn’t apply.</span>
          </label>
          <div className="field">
            <span className="field-label">Icon</span>
            <IconPicker value={section.iconName} onChange={(iconName) => onChange({ ...section, iconName })} label="Section icon" />
          </div>
          <div className="field">
            <span className="field-label">Colour</span>
            <TonePicker value={section.tone} onChange={(tone) => onChange({ ...section, tone })} label="Section colour" />
          </div>

          <h3 className="group-title">Fields</h3>
          {section.blocks.length === 0 && <p className="muted small">No fields yet. Add the first one below.</p>}
          <ul className="fe-list">
            {section.blocks.map((b, i) => (
              <FieldEditor
                key={"key" in b ? b.key : `h${i}`}
                block={b}
                first={i === 0}
                last={i === section.blocks.length - 1}
                onChange={(next) => setBlocks(section.blocks.map((x, j) => (j === i ? next : x)))}
                onMove={(dir) => setBlocks(moveItem(section.blocks, i, i + dir))}
                onDelete={() => setBlocks(section.blocks.filter((_, j) => j !== i))}
                onDuplicate={() => setBlocks([...section.blocks.slice(0, i + 1), cloneBlock(b, section.key), ...section.blocks.slice(i + 1)])}
              />
            ))}
          </ul>

          {palette ? (
            <div className="palette" role="menu" aria-label="Add a field">
              {FIELD_KINDS.map((k) => (
                <button type="button" role="menuitem" key={k.kind} className="palette-item" onClick={() => add(k.kind)}>
                  <strong>{k.label}</strong>
                  <span className="muted small">{k.hint}</span>
                </button>
              ))}
              <button type="button" role="menuitem" className="palette-item" onClick={() => add("heading")}>
                <strong>Group heading</strong>
                <span className="muted small">Starts a new card in the section</span>
              </button>
              <button type="button" className="btn ghost sm" onClick={() => setPalette(false)}>Cancel</button>
            </div>
          ) : (
            <button type="button" className="btn secondary sm" onClick={() => setPalette(true)}><Icon name="plus" size={16} /> Add field</button>
          )}
        </div>
      )}
    </li>
  );
}
