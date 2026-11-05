"use client";

import { memo, type ReactNode } from "react";
import type { BlockDef, ChoiceQtyValue, RouteRow } from "@/lib/types";

export type OnChange = (key: string, value: unknown) => void;
type B<T extends BlockDef["t"]> = Extract<BlockDef, { t: T }>;

const asStr = (v: unknown) => (typeof v === "string" ? v : "");
const asArr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
const asObj = <T,>(v: unknown): Record<string, T> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, T>) : {});

export function Field({ label, required, children }: { label?: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="field">
      {label && (
        <span className="field-label">
          {label}
          {required && <span className="req" title="Required"> *</span>}
        </span>
      )}
      {children}
    </div>
  );
}

// ── simple inputs ──

export const TextBlock = memo(function TextBlock({ block, value, onChange }: { block: B<"text" | "textarea" | "number">; value: unknown; onChange: OnChange }) {
  const common = {
    value: asStr(value),
    placeholder: block.placeholder,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(block.key, e.target.value),
    "aria-label": block.label,
  };
  return (
    <Field label={block.label} required={block.required}>
      {block.t === "textarea" ? (
        <textarea className="input" rows={3} {...common} />
      ) : (
        <input className="input" type={block.t === "number" ? "number" : "text"} inputMode={block.t === "number" ? "decimal" : undefined} min={block.t === "number" ? 0 : undefined} {...common} />
      )}
    </Field>
  );
});

export const DateBlock = memo(function DateBlock({ block, value, onChange }: { block: B<"date">; value: unknown; onChange: OnChange }) {
  return (
    <Field label={block.label} required={block.required}>
      <input className="input" type="date" value={asStr(value)} onChange={(e) => onChange(block.key, e.target.value)} aria-label={block.label} />
    </Field>
  );
});

export const SelectBlock = memo(function SelectBlock({ block, value, onChange }: { block: B<"select">; value: unknown; onChange: OnChange }) {
  return (
    <Field label={block.label} required={block.required}>
      <select className="input" value={asStr(value)} onChange={(e) => onChange(block.key, e.target.value)} aria-label={block.label}>
        <option value="">— select —</option>
        {block.options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </Field>
  );
});

// ── pills ──

export function Pill({ on, onClick, children, tone }: { on: boolean; onClick: () => void; children: ReactNode; tone?: string }) {
  return (
    <button type="button" className={`pill${on ? " on" : ""}${tone ? " " + tone : ""}`} aria-pressed={on} onClick={onClick}>
      {children}
    </button>
  );
}

export const ChoiceBlock = memo(function ChoiceBlock({ block, value, onChange }: { block: B<"choice">; value: unknown; onChange: OnChange }) {
  const sel = block.multi ? asArr(value) : asStr(value);
  const toggle = (o: string) => {
    if (block.multi) {
      const cur = sel as string[];
      onChange(block.key, cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o]);
    } else {
      onChange(block.key, sel === o ? "" : o); // tap again to clear
    }
  };
  return (
    <Field label={block.label} required={block.required}>
      <div className="pills" role={block.multi ? "group" : "radiogroup"} aria-label={block.label}>
        {block.options.map((o) => (
          <Pill key={o} on={block.multi ? (sel as string[]).includes(o) : sel === o} onClick={() => toggle(o)}>
            {o}
          </Pill>
        ))}
      </div>
    </Field>
  );
});

const checkTone = (o: string) => (o === "Y" || o === "OK" ? "good" : o === "N" || o === "Full" ? "bad" : "neutral");

/** Compact Y / N / N/A row used by the audit checklists. */
export const CheckBlock = memo(function CheckBlock({ block, value, onChange }: { block: B<"check">; value: unknown; onChange: OnChange }) {
  const sel = asStr(value);
  return (
    <div className="check-row">
      <span className="check-label">{block.label}</span>
      <div className="seg" role="radiogroup" aria-label={block.label}>
        {block.options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={sel === o} className={`seg-btn${sel === o ? " on " + checkTone(o) : ""}`} onClick={() => onChange(block.key, sel === o ? "" : o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
});

// ── structured rows ──

export const RoutesBlock = memo(function RoutesBlock({ block, value, onChange }: { block: B<"routes">; value: unknown; onChange: OnChange }) {
  const rows: RouteRow[] = Array.isArray(value) ? (value as RouteRow[]) : [];
  const set = (i: number, patch: Partial<RouteRow>) => onChange(block.key, rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="rows">
      {rows.map((r, i) => {
        const ph = block.placeholders[i] ?? ["From", "To"];
        return (
          <div className="route-row" key={i}>
            <input className="input" placeholder={ph[0] || "From"} value={r.from} onChange={(e) => set(i, { from: e.target.value })} aria-label={`Route ${i + 1} from`} />
            <input className="input" placeholder={ph[1] || "To"} value={r.to} onChange={(e) => set(i, { to: e.target.value })} aria-label={`Route ${i + 1} to`} />
            <input className="input num" type="number" inputMode="decimal" min={0} placeholder="mtr" value={r.distance} onChange={(e) => set(i, { distance: e.target.value })} aria-label={`Route ${i + 1} distance in metres`} />
            <button type="button" className="icon-btn" aria-label={`Remove route ${i + 1}`} onClick={() => onChange(block.key, rows.filter((_, j) => j !== i))}>
              ✕
            </button>
          </div>
        );
      })}
      <button type="button" className="btn ghost sm" onClick={() => onChange(block.key, [...rows, { from: "", to: "", distance: "" }])}>
        + Add route
      </button>
      {rows.length > 0 && <div className="muted small">Total: {rows.reduce((n, r) => n + (parseFloat(r.distance) || 0), 0)} mtr</div>}
    </div>
  );
});

export const QtyListBlock = memo(function QtyListBlock({ block, value, onChange }: { block: B<"qtyList">; value: unknown; onChange: OnChange }) {
  const v = asObj<string>(value);
  return (
    <div className="qty-list">
      {block.items.map((it) => (
        <label className="qty-row" key={it.key}>
          <span>{it.label}</span>
          <input className="input num" type="number" inputMode="numeric" min={0} placeholder="0" value={v[it.key] ?? ""} onChange={(e) => onChange(block.key, { ...v, [it.key]: e.target.value })} />
        </label>
      ))}
    </div>
  );
});

export const ChoiceQtyBlock = memo(function ChoiceQtyBlock({ block, value, onChange }: { block: B<"choiceQty">; value: unknown; onChange: OnChange }) {
  const v = asObj<string>(value) as ChoiceQtyValue;
  const set = (patch: ChoiceQtyValue) => onChange(block.key, { ...v, ...patch });
  return (
    <div className="qty-row">
      <span>{block.label}</span>
      <div className="row-end">
        {block.yn && (
          <div className="seg">
            {["Yes", "No"].map((o) => (
              <button key={o} type="button" className={`seg-btn${v.yn === o ? " on " + (o === "Yes" ? "good" : "bad") : ""}`} onClick={() => set({ yn: v.yn === o ? "" : o })}>
                {o}
              </button>
            ))}
          </div>
        )}
        {block.qty && <input className="input num" type="number" inputMode="numeric" min={0} placeholder="Qty" value={v.qty ?? ""} onChange={(e) => set({ qty: e.target.value })} aria-label={`${block.label} quantity`} />}
      </div>
    </div>
  );
});

/** Item rows with selectable variants; picking a variant reveals its quantity box. */
export const AccessoriesBlock = memo(function AccessoriesBlock({ block, value, onChange }: { block: B<"accessories">; value: unknown; onChange: OnChange }) {
  const v = asObj<Record<string, string>>(value);
  return (
    <div className="acc">
      {block.rows.map((row) => {
        const picked = asObj<string>(v[row.key]);
        const setRow = (next: Record<string, string>) => onChange(block.key, { ...v, [row.key]: next });
        return (
          <div className="acc-row" key={row.key}>
            <div className="acc-title">{row.label}</div>
            <div className="pills">
              {row.options.map((o) => {
                const on = o.value in picked;
                return (
                  <Pill
                    key={o.value}
                    on={on}
                    onClick={() => {
                      const next = { ...picked };
                      if (on) delete next[o.value];
                      else next[o.value] = "";
                      setRow(next);
                    }}
                  >
                    {o.label}
                  </Pill>
                );
              })}
            </div>
            {row.options
              .filter((o) => o.value in picked)
              .map((o) => (
                <label className="qty-row inset" key={o.value}>
                  <span>{o.label}</span>
                  <input className="input num" type="number" inputMode="numeric" min={0} placeholder="Qty" value={picked[o.value] ?? ""} onChange={(e) => setRow({ ...picked, [o.value]: e.target.value })} />
                </label>
              ))}
          </div>
        );
      })}
    </div>
  );
});
