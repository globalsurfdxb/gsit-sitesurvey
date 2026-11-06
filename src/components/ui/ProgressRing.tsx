export function ProgressRing({ pct, size = 44, label }: { pct: number; size?: number; label?: string }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const done = pct >= 100;
  return (
    <div className={`ring${done ? " done" : ""}`} style={{ width: size, height: size }} role="img" aria-label={`${pct}% of required fields complete${label ? ` (${label})` : ""}`} title={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" />
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c - (c * Math.min(100, pct)) / 100} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span>{pct}%</span>
    </div>
  );
}
