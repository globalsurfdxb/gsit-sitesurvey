import { ImageResponse } from "next/og";
import { LOGO_BLUE, LOGO_INK } from "@/components/brand/logo-paths";

// App icons rendered from the logo's own geometry, so the repo needs no binary assets.
//  · rounded:  the shape is part of the artwork (Android "any" icons, browser tabs, install prompts).
//  · full-bleed: edge to edge, because the phone applies its own mask (maskable on Android, apple-touch on iOS).
//    Android keeps only the centre 80% circle, so the mark is scaled down to stay inside it.
const VARIANTS = {
  "192": { size: 192, rounded: true, mark: 0.7 },
  "512": { size: 512, rounded: true, mark: 0.7 },
  "512-maskable": { size: 512, rounded: false, mark: 0.6 },
  "180": { size: 180, rounded: false, mark: 0.66 },
} as const;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((name) => ({ name }));
}

const VB_W = 87; // "GS" + the blue square
const VB_H = 41;

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const v = VARIANTS[name as keyof typeof VARIANTS];
  if (!v) return new Response("Not found", { status: 404 });

  const s = v.size;
  const markW = Math.round(s * v.mark);
  const markH = Math.round((markW * VB_H) / VB_W);
  const unit = markW / VB_W; // one logo unit in pixels
  const lift = Math.round(s * 0.012); // depth of the soft shadow under the letters

  const mark = (fill: string, blue: string) => (
    <svg width={markW} height={markH} viewBox={`0 0 ${VB_W} ${VB_H}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {LOGO_INK.map((d) => (
        <path key={d} d={d} fill={fill} />
      ))}
      <path d={LOGO_BLUE} fill={blue} />
    </svg>
  );

  // Centre of the blue square inside the mark, for its glow.
  const glow = Math.round(unit * 20);
  const glowX = Math.round(unit * 82.8 - glow / 2);
  const glowY = Math.round(unit * 37.5 - glow / 2);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRadius: v.rounded ? Math.round(s * 0.225) : 0,
          background: "linear-gradient(155deg, #1a5fc7 0%, #114a9f 38%, #0a2d63 72%, #050d1f 100%)",
        }}
      >
        {/* light pooling in the top-left corner, like glass catching a lamp */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", background: "radial-gradient(circle at 15% 8%, rgba(120,175,255,0.75) 0%, rgba(60,120,230,0.22) 38%, rgba(17,74,159,0) 62%)" }} />
        {/* cool grey bounce light, bottom-right (the logo's silver) */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", background: "radial-gradient(circle at 100% 100%, rgba(150,150,160,0.38) 0%, rgba(150,150,160,0) 50%)" }} />
        {/* diagonal gloss */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", background: "linear-gradient(118deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.06) 34%, rgba(255,255,255,0) 35%)" }} />
        {/* hairline edge */}
        {v.rounded && (
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", borderRadius: Math.round(s * 0.225), border: `${Math.max(1, Math.round(s * 0.006))}px solid rgba(255,255,255,0.22)` }} />
        )}

        {/* the letters sit left of the mark's box (the blue square is on the right), so nudge it to centre them optically */}
        <div style={{ position: "relative", display: "flex", width: markW, height: markH, left: Math.round(markW * 0.045) }}>
          <div style={{ position: "absolute", left: glowX, top: glowY, width: glow, height: glow, display: "flex", background: "radial-gradient(circle, rgba(110,175,255,0.9) 0%, rgba(110,175,255,0) 70%)" }} />
          <div style={{ position: "absolute", left: lift, top: lift * 1.6, display: "flex" }}>{mark("rgba(2,10,30,0.38)", "rgba(2,10,30,0.0)")}</div>
          <div style={{ position: "absolute", left: 0, top: 0, display: "flex" }}>{mark("#ffffff", "#6fb0ff")}</div>
        </div>
      </div>
    ),
    { width: s, height: s },
  );
}
