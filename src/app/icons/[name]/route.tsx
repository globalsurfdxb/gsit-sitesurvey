import { ImageResponse } from "next/og";
import { LOGO_BLUE, LOGO_INK } from "@/components/brand/logo-paths";

// PWA icons rendered at build time from the logo's own geometry, so the repo needs no binary assets.
// "maskable" keeps the mark inside the 80% safe zone because Android crops it to a shape.
const VARIANTS = {
  "192": { size: 192, safe: 1 },
  "512": { size: 512, safe: 1 },
  "512-maskable": { size: 512, safe: 0.74 },
} as const;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((name) => ({ name }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const v = VARIANTS[name as keyof typeof VARIANTS];
  if (!v) return new Response("Not found", { status: 404 });

  const tileW = Math.round(v.size * 0.7 * v.safe);
  const tileH = Math.round(v.size * 0.42 * v.safe);
  const markW = Math.round(tileW * 0.66);
  const markH = Math.round((markW * 41) / 87); // "GS" + blue square: viewBox 87 × 41

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 18% 12%, rgba(42,115,221,0.85) 0%, rgba(17,74,159,0.35) 38%, rgba(17,74,159,0) 68%), radial-gradient(circle at 92% 100%, rgba(122,121,124,0.45) 0%, rgba(122,121,124,0) 55%), linear-gradient(160deg, #0b1a36 0%, #04070e 100%)",
        }}
      >
        {/* glass tile */}
        <div
          style={{
            width: tileW,
            height: tileH,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: Math.round(v.size * 0.12 * v.safe),
            border: `${Math.max(2, Math.round(v.size * 0.006))}px solid rgba(255,255,255,0.28)`,
            background: "linear-gradient(145deg, rgba(255,255,255,0.20), rgba(255,255,255,0.06))",
            boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          }}
        >
          <svg width={markW} height={markH} viewBox="0 0 87 41" fill="none" xmlns="http://www.w3.org/2000/svg">
            {LOGO_INK.map((d) => (
              <path key={d} d={d} fill="#ffffff" />
            ))}
            <path d={LOGO_BLUE} fill="#4b94ff" />
          </svg>
        </div>
      </div>
    ),
    { width: v.size, height: v.size },
  );
}
