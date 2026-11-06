import { LOGO_BLUE, LOGO_GREY, LOGO_INK } from "./logo-paths";

/**
 * GS IT wordmark. Colours come from CSS variables (--logo-ink / --logo-blue / --logo-grey)
 * so the black part turns white on dark backgrounds and black again when printing.
 * With `mark`, only "GS" and the blue square are drawn (for tight spaces).
 */
export function Logo({ height = 28, mark = false, className = "" }: { height?: number; mark?: boolean; className?: string }) {
  const w = mark ? 87 : 136;
  return (
    <svg className={`logo ${className}`} viewBox={`0 0 ${w} 41`} width={(height * w) / 41} height={height} role="img" aria-label="Global Surf IT" focusable="false">
      <g className="logo-ink">
        {LOGO_INK.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <path className="logo-blue" d={LOGO_BLUE} />
      {!mark && (
        <g className="logo-grey">
          {LOGO_GREY.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      )}
    </svg>
  );
}
