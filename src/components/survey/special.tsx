"use client";

import { memo } from "react";
import { CAMERA_ROWS } from "@/lib/camera";
import { newCameraSet, uid } from "@/lib/survey";
import type { BlockDef, CameraSet, ManpowerRow, MaterialRow } from "@/lib/types";
import { Pill, type OnChange } from "./blocks";

type B<T extends BlockDef["t"]> = Extract<BlockDef, { t: T }>;
const num = (s: string) => parseFloat(s) || 0;

// ── Data points ──

export const DataPointsBlock = memo(function DataPointsBlock({ block, value, onChange }: { block: B<"dataPoints">; value: unknown; onChange: OnChange }) {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, string>;
  const total = Object.values(v).reduce((n, x) => n + (parseInt(x) || 0), 0);
  return (
    <div className="dp">
      {block.groups.map((g) => (
        <div key={g.group}>
          <div className="dp-group">{g.group}</div>
          {g.items.map((item) => (
            <label className="qty-row" key={item}>
              <span>
                <i className="dot" style={{ background: g.color }} />
                {item}
              </span>
              <input className="input num" type="number" inputMode="numeric" min={0} placeholder="0" value={v[item] ?? ""} onChange={(e) => onChange(block.key, { ...v, [item]: e.target.value })} />
            </label>
          ))}
        </div>
      ))}
      <div className="total-bar">
        <span>Total data points</span>
        <strong>{total}</strong>
      </div>
    </div>
  );
});

// ── Materials ──

export const MaterialsBlock = memo(function MaterialsBlock({ block, value, onChange }: { block: B<"materials">; value: unknown; onChange: OnChange }) {
  const rows: MaterialRow[] = Array.isArray(value) ? (value as MaterialRow[]) : [];
  const set = (id: string, patch: Partial<MaterialRow>) => onChange(block.key, rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  return (
    <div className="rows">
      <div className="muted small">
        {rows.length} item{rows.length === 1 ? "" : "s"} · tick items once packed or confirmed
      </div>
      {rows.map((r, i) => (
        <div className={`mat-row${r.done ? " done" : ""}`} key={r.id}>
          <input type="checkbox" className="check" checked={r.done} onChange={(e) => set(r.id, { done: e.target.checked })} aria-label={`Item ${i + 1} done`} />
          <input className="input" placeholder="Material name" value={r.name} onChange={(e) => set(r.id, { name: e.target.value })} aria-label={`Item ${i + 1} name`} />
          <input className="input num" type="number" inputMode="numeric" min={1} value={r.qty} onChange={(e) => set(r.id, { qty: e.target.value })} aria-label={`Item ${i + 1} quantity`} />
          <button type="button" className="icon-btn" aria-label={`Remove item ${i + 1}`} onClick={() => onChange(block.key, rows.filter((x) => x.id !== r.id))}>
            ✕
          </button>
        </div>
      ))}
      <button type="button" className="btn amber sm" onClick={() => onChange(block.key, [...rows, { id: uid(), name: "", qty: "1", done: false }])}>
        + Add material
      </button>
    </div>
  );
});

// ── Manpower ──

export const ManpowerBlock = memo(function ManpowerBlock({ block, value, onChange }: { block: B<"manpower">; value: unknown; onChange: OnChange }) {
  const rows: ManpowerRow[] = Array.isArray(value) ? (value as ManpowerRow[]) : [];
  const set = (id: string, patch: Partial<ManpowerRow>) => onChange(block.key, rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const head = rows.reduce((n, r) => n + num(r.headcount), 0);
  const manDays = rows.reduce((n, r) => n + num(r.headcount) * num(r.days), 0);
  const manHours = rows.reduce((n, r) => n + num(r.headcount) * num(r.days) * num(r.hoursPerDay), 0);
  return (
    <div className="rows">
      <div className="stats">
        <div><span>Headcount</span><strong>{head}</strong></div>
        <div><span>Man-days</span><strong className="teal">{manDays}</strong></div>
        <div><span>Man-hours</span><strong className="green">{manHours}</strong></div>
      </div>
      {rows.map((r, i) => (
        <div className="card-sub" key={r.id}>
          <div className="card-sub-head">
            <strong>Resource {i + 1}</strong>
            <button type="button" className="icon-btn" aria-label={`Remove resource ${i + 1}`} onClick={() => onChange(block.key, rows.filter((x) => x.id !== r.id))}>
              ✕
            </button>
          </div>
          <div className="grid2">
            <input className="input" placeholder="Name or TBD" value={r.name} onChange={(e) => set(r.id, { name: e.target.value })} aria-label="Name" />
            <select className="input" value={r.role} onChange={(e) => set(r.id, { role: e.target.value })} aria-label="Role">
              <option value="">— role —</option>
              {block.roles.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </div>
          <input className="input" placeholder="Designation / scope, e.g. Cabling" value={r.designation} onChange={(e) => set(r.id, { designation: e.target.value })} aria-label="Designation" />
          <div className="grid3">
            <label className="mini"><span>Headcount</span><input className="input num" type="number" inputMode="numeric" min={1} value={r.headcount} onChange={(e) => set(r.id, { headcount: e.target.value })} /></label>
            <label className="mini"><span>Days</span><input className="input num" type="number" inputMode="decimal" min={0} placeholder="0" value={r.days} onChange={(e) => set(r.id, { days: e.target.value })} /></label>
            <label className="mini"><span>Hrs / day</span><input className="input num" type="number" inputMode="decimal" min={1} max={24} value={r.hoursPerDay} onChange={(e) => set(r.id, { hoursPerDay: e.target.value })} /></label>
          </div>
        </div>
      ))}
      <button type="button" className="btn amber sm" onClick={() => onChange(block.key, [...rows, { id: uid(), name: "", role: "", designation: "", headcount: "1", days: "", hoursPerDay: "8" }])}>
        + Add resource
      </button>
    </div>
  );
});

// ── Camera sets ──

export const CameraSetsBlock = memo(function CameraSetsBlock({ block, value, onChange }: { block: B<"cameraSets">; value: unknown; onChange: OnChange }) {
  const sets: CameraSet[] = Array.isArray(value) ? (value as CameraSet[]) : [];
  const set = (id: string, patch: Partial<CameraSet>) => onChange(block.key, sets.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const totalCams = sets.reduce((n, s) => n + (parseInt(s.qty) || 0), 0);
  return (
    <div className="rows">
      {sets.map((s, i) => (
        <div className="card-sub" key={s.id}>
          <div className="card-sub-head">
            <strong>Camera set {i + 1}</strong>
            {sets.length > 1 && (
              <button type="button" className="btn ghost sm danger" onClick={() => onChange(block.key, sets.filter((x) => x.id !== s.id))}>
                Remove
              </button>
            )}
          </div>
          {CAMERA_ROWS.map((row) => {
            const sel = s[row.field];
            return (
              <div className="field" key={row.field}>
                <span className="field-label">{row.label}</span>
                <div className="pills">
                  {row.options.map((o) => (
                    <Pill key={o.label} on={sel.includes(o.label)} onClick={() => set(s.id, { [row.field]: sel.includes(o.label) ? sel.filter((x) => x !== o.label) : [...sel, o.label] })}>
                      {o.label}
                      {o.spec && <small className="spec">{o.spec}</small>}
                    </Pill>
                  ))}
                </div>
              </div>
            );
          })}
          <div className="stepper">
            <span>Camera quantity</span>
            <div className="stepper-ctl">
              <button type="button" className="icon-btn" aria-label="Decrease" onClick={() => set(s.id, { qty: String(Math.max(0, (parseInt(s.qty) || 0) - 1)) })}>−</button>
              <input className="input num" type="number" inputMode="numeric" min={0} placeholder="0" value={s.qty} onChange={(e) => set(s.id, { qty: e.target.value })} aria-label="Camera quantity" />
              <button type="button" className="icon-btn" aria-label="Increase" onClick={() => set(s.id, { qty: String((parseInt(s.qty) || 0) + 1) })}>+</button>
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn amber sm" onClick={() => onChange(block.key, [...sets, newCameraSet()])}>
        + Add camera set
      </button>
      <div className="total-bar">
        <span>Total cameras</span>
        <strong>{totalCams}</strong>
      </div>
    </div>
  );
});
