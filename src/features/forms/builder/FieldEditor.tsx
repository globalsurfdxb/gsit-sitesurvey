"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { BlockDef } from "@/lib/types";
import { hasRequired, kindLabel, kindOf, rid } from "./model";

/** A list edited as one line per entry. Keeps its own text so blank lines survive while typing. */
function LinesEditor({ label, value, onChange, rows = 4 }: { label: string; value: string[]; onChange: (v: string[]) => void; rows?: number }) {
  const [text, setText] = useState(value.join("\n"));
  return (
    <label className="field">
      <span className="field-label">{label} <span className="muted small">(one per line)</span></span>
      <textarea
        className="input"
        rows={rows}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(e.target.value.split("\n").map((l) => l.trim()).filter(Boolean));
        }}
      />
    </label>
  );
}

interface Props {
  block: BlockDef;
  onChange: (next: BlockDef) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  first: boolean;
  last: boolean;
}

/** Editor for one block: label, required flag and whatever options its type has. */
export function FieldEditor({ block, onChange, onMove, onDelete, onDuplicate, first, last }: Props) {
  const kind = kindOf(block);
  // One cast in one place: patches are built per block type below, so they are valid for it.
  const patch = (p: Record<string, unknown>) => onChange({ ...block, ...p } as BlockDef);
  const hasLabel = "label" in block;

  return (
    <li className={`fe fe-${kind}`}>
      <div className="fe-head">
        <span className="tag blue fe-kind">{kindLabel(block)}</span>
        {block.t === "heading" ? (
          <input className="input fe-label" aria-label="Group heading" value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} placeholder="Group heading" />
        ) : hasLabel ? (
          <input className="input fe-label" aria-label="Field label" value={(block as { label: string }).label} onChange={(e) => patch({ label: e.target.value })} placeholder="Field label" />
        ) : (
          <span className="fe-label muted">{kind === "photos" ? "Photo slots" : "Special block"}</span>
        )}
        <div className="fe-tools">
          <button type="button" className="icon-btn" onClick={() => onMove(-1)} disabled={first} aria-label="Move up"><Icon name="arrow-up" size={16} /></button>
          <button type="button" className="icon-btn" onClick={() => onMove(1)} disabled={last} aria-label="Move down"><Icon name="arrow-down" size={16} /></button>
          {kind !== "heading" && <button type="button" className="icon-btn" onClick={onDuplicate} aria-label="Duplicate field"><Icon name="copy" size={16} /></button>}
          <button type="button" className="icon-btn danger" onClick={onDelete} aria-label="Delete field"><Icon name="trash" size={16} /></button>
        </div>
      </div>

      {kind !== "heading" && (
        <div className="fe-body">
          {(block.t === "text" || block.t === "textarea" || block.t === "number") && (
            <input className="input" aria-label="Placeholder" value={block.placeholder ?? ""} onChange={(e) => patch({ placeholder: e.target.value })} placeholder="Hint shown inside the box (optional)" />
          )}
          {block.t === "date" && (
            <label className="fe-check"><input type="checkbox" className="check" checked={!!block.defaultToday} onChange={(e) => patch({ defaultToday: e.target.checked })} /> Start with today’s date</label>
          )}
          {(block.t === "select" || block.t === "choice" || block.t === "check") && <LinesEditor label="Options" value={block.options} onChange={(options) => patch({ options })} />}
          {block.t === "upload" && <LinesEditor label="Document types" value={block.typeOptions} onChange={(typeOptions) => patch({ typeOptions })} rows={3} />}
          {block.t === "materials" && <LinesEditor label="Items listed by default" value={block.defaults} onChange={(defaults) => patch({ defaults })} />}
          {block.t === "manpower" && <LinesEditor label="Roles to choose from" value={block.roles} onChange={(roles) => patch({ roles })} rows={3} />}
          {block.t === "photos" && (
            <div className="stack slots">
              {block.slots.map((s, i) => (
                <div className="row-end full" key={s.key}>
                  <input className="input" aria-label={`Photo slot ${i + 1} name`} value={s.label} onChange={(e) => patch({ slots: block.slots.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} placeholder="e.g. Rack front" />
                  <button type="button" className="icon-btn" aria-label={`Remove photo slot ${i + 1}`} disabled={block.slots.length === 1} onClick={() => patch({ slots: block.slots.filter((_, j) => j !== i) })}><Icon name="x" size={16} /></button>
                </div>
              ))}
              <button type="button" className="btn ghost sm" onClick={() => patch({ slots: [...block.slots, { key: `p_${rid()}`, label: `Photo ${block.slots.length + 1}` }] })}>+ Add photo slot</button>
            </div>
          )}
          {kind === "special" && <p className="muted small">Built-in block from the ELV checklist. You can reorder or remove it; its layout isn’t editable.</p>}
          {hasRequired(block) && (
            <label className="fe-check"><input type="checkbox" className="check" checked={!!(block as { required?: boolean }).required} onChange={(e) => patch({ required: e.target.checked })} /> Required</label>
          )}
        </div>
      )}
    </li>
  );
}
