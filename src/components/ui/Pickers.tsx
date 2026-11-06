"use client";

import { PICKABLE_ICONS, TONES } from "@/lib/form-schema";
import { asIconName, Icon } from "./Icon";

/** Choose one of the app's icons (departments and form sections). */
export function IconPicker({ value, onChange, label = "Icon" }: { value: string | undefined; onChange: (name: string) => void; label?: string }) {
  return (
    <div className="pick-grid" role="radiogroup" aria-label={label}>
      {PICKABLE_ICONS.map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={n} title={n} className={`pick-btn${value === n ? " on" : ""}`} onClick={() => onChange(n)}>
          <Icon name={asIconName(n)} size={18} />
        </button>
      ))}
    </div>
  );
}

/** Choose a colour tone (the same family the section icons use). */
export function TonePicker({ value, onChange, label = "Colour" }: { value: string | undefined; onChange: (tone: string) => void; label?: string }) {
  return (
    <div className="pick-grid" role="radiogroup" aria-label={label}>
      {TONES.map((t) => (
        <button key={t} type="button" role="radio" aria-checked={value === t} aria-label={t} title={t} className={`pick-btn tone-${t}${value === t ? " on" : ""}`} onClick={() => onChange(t)}>
          <span className="tone-dot" />
        </button>
      ))}
    </div>
  );
}

/** Coloured tile showing a department's or section's icon. */
export function IconTile({ icon, tone, size = 20, large }: { icon: string | undefined; tone: string; size?: number; large?: boolean }) {
  return (
    <span className={`sec-icon${large ? " lg" : ""} tone-${tone}`}>
      <Icon name={asIconName(icon, "building")} size={size} />
    </span>
  );
}
