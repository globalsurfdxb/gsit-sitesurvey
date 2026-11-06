"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/components/AppProvider";
import { LOGO_BLUE, LOGO_GREY, LOGO_INK } from "./logo-paths";

/** Shortest time the launch screen stays up, counted from the start of the page load, so the light sweep is seen at least once. */
const MIN_MS = 1100;
/** Never keep the launch screen longer than this, whatever the app is waiting for. */
const MAX_MS = 4500;
const FADE_MS = 520;

const ALL = [...LOGO_INK, LOGO_BLUE, ...LOGO_GREY];

/**
 * Launch screen shown when the app is opened (from the home-screen icon or a fresh load): the GS IT logo
 * with a sweep of light across it. It is part of the server-rendered page, so it is on screen before any
 * script has run, and it lifts away once the app knows who is signed in. Navigating inside the app never shows it again.
 */
export function Splash() {
  const { ready } = useApp();
  const [phase, setPhase] = useState<"show" | "out" | "gone">("show");

  // Lift once the app is ready (after the minimum time), or after the hard limit.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const min = reduce ? 250 : MIN_MS;
    const sinceLoad = performance.now();
    const t = ready ? window.setTimeout(() => setPhase((p) => (p === "show" ? "out" : p)), Math.max(0, min - sinceLoad)) : undefined;
    const cap = window.setTimeout(() => setPhase((p) => (p === "show" ? "out" : p)), Math.max(0, MAX_MS - sinceLoad));
    return () => {
      if (t) window.clearTimeout(t);
      window.clearTimeout(cap);
    };
  }, [ready]);

  useEffect(() => {
    if (phase !== "out") return;
    const t = window.setTimeout(() => setPhase("gone"), FADE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div className={`splash${phase === "out" ? " out" : ""}`} aria-hidden="true">
      <div className="splash-glow" />
      <div className="splash-stage">
        <svg className="splash-logo" viewBox="0 0 136 41" role="presentation" focusable="false">
          <defs>
            <clipPath id="splash-clip">
              {ALL.map((d) => (
                <path key={d} d={d} />
              ))}
            </clipPath>
            <linearGradient id="splash-beam" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.95" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g className="logo-ink">
            {LOGO_INK.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          <path className="logo-blue splash-dot" d={LOGO_BLUE} />
          <g className="logo-grey">
            {LOGO_GREY.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          {/* the light: a slanted beam that travels across the letters, clipped to their shape */}
          <g clipPath="url(#splash-clip)">
            <rect className="splash-beam" x="-44" y="-8" width="44" height="58" fill="url(#splash-beam)" />
          </g>
        </svg>
        <div className="splash-title">Site Survey</div>
        <div className="splash-bar">
          <span />
        </div>
      </div>
    </div>
  );
}
