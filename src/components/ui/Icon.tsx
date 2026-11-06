import type { ReactNode } from "react";

// Small stroke icon set (24×24 grid, 2px stroke), in the style of Lucide/Feather.
const P = (d: string) => <path d={d} />;

const ICONS = {
  home: <>{P("M3 11l9-8 9 8")}{P("M5 10v10h5v-6h4v6h5V10")}</>,
  list: <>{P("M8 6h13M8 12h13M8 18h13")}{P("M3 6h.01M3 12h.01M3 18h.01")}</>,
  user: <>{P("M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2")}<circle cx="12" cy="7" r="4" /></>,
  plus: P("M12 5v14M5 12h14"),
  "chevron-left": P("M15 18l-6-6 6-6"),
  "chevron-right": P("M9 18l6-6-6-6"),
  "chevron-down": P("M6 9l6 6 6-6"),
  "arrow-left": P("M19 12H5M12 19l-7-7 7-7"),
  check: P("M20 6L9 17l-5-5"),
  "check-circle": <><circle cx="12" cy="12" r="10" />{P("M9 12l2 2 4-4")}</>,
  x: P("M18 6L6 18M6 6l12 12"),
  search: <><circle cx="11" cy="11" r="8" />{P("M21 21l-4.3-4.3")}</>,
  trash: P("M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"),
  camera: <>{P("M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z")}<circle cx="12" cy="13" r="4" /></>,
  "wifi-off": P("M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"),
  refresh: P("M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"),
  sun: <><circle cx="12" cy="12" r="5" />{P("M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42")}</>,
  moon: P("M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"),
  download: P("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"),
  "log-out": P("M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"),
  file: P("M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"),
  paperclip: P("M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"),
  alert: P("M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01"),
  sliders: P("M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"),
  cloud: P("M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"),
  clipboard: <>{P("M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2")}<rect x="8" y="2" width="8" height="4" rx="1" /></>,
  clock: <><circle cx="12" cy="12" r="10" />{P("M12 6v6l4 2")}</>,
  // section icons
  briefcase: <><rect x="2" y="7" width="20" height="14" rx="2" />{P("M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16")}</>,
  plug: P("M12 22v-5M9 8V2M15 8V2M18 8v5a6 6 0 0 1-12 0V8z"),
  server: <><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" />{P("M6 6h.01M6 18h.01")}</>,
  network: <><rect x="9" y="2" width="6" height="6" /><rect x="2" y="16" width="6" height="6" /><rect x="16" y="16" width="6" height="6" />{P("M12 8v4M5 16v-2a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2")}</>,
  video: <>{P("M23 7l-7 5 7 5V7z")}<rect x="1" y="5" width="15" height="14" rx="2" /></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" />{P("M7 11V7a5 5 0 0 1 10 0v4")}</>,
  shield: P("M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"),
  "user-check": <>{P("M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2")}<circle cx="8.5" cy="7" r="4" />{P("M17 11l2 2 4-4")}</>,
  zap: P("M13 2L3 14h9l-1 8 10-12h-9l1-8z"),
  package: P("M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"),
  users: <>{P("M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2")}<circle cx="9" cy="7" r="4" />{P("M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75")}</>,
  "map-pin": <>{P("M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z")}<circle cx="12" cy="10" r="3" /></>,
  // departments, forms and the form builder
  monitor: <><rect x="2" y="3" width="20" height="14" rx="2" />{P("M8 21h8M12 17v4")}</>,
  speaker: <>{P("M11 5L6 9H2v6h4l5 4V5z")}{P("M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07")}</>,
  wifi: P("M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"),
  cpu: <><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" />{P("M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3")}</>,
  database: <><ellipse cx="12" cy="5" rx="9" ry="3" />{P("M21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5")}</>,
  building: <><rect x="4" y="2" width="16" height="20" rx="2" />{P("M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01")}</>,
  layers: <>{P("M12 2L2 7l10 5 10-5-10-5z")}{P("M2 17l10 5 10-5M2 12l10 5 10-5")}</>,
  edit: <>{P("M12 20h9")}{P("M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z")}</>,
  copy: <><rect x="9" y="9" width="13" height="13" rx="2" />{P("M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1")}</>,
  "arrow-up": P("M12 19V5M5 12l7-7 7 7"),
  "arrow-down": P("M12 5v14M19 12l-7 7-7-7"),
  mail: <>{P("M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z")}{P("M22 6l-10 7L2 6")}</>,
  eye: <>{P("M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z")}<circle cx="12" cy="12" r="3" /></>,
  "bar-chart": P("M12 20V10M18 20V4M6 20v-4"),
  "user-plus": <>{P("M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2")}<circle cx="8.5" cy="7" r="4" />{P("M20 8v6M23 11h-6")}</>,
  star: P("M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

/** Icon names a form or department may store; anything unknown renders as a clipboard rather than nothing. */
export const asIconName = (name: string | undefined, fallback: IconName = "clipboard"): IconName => (name && name in ICONS ? (name as IconName) : fallback);

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {ICONS[name]}
    </svg>
  );
}
