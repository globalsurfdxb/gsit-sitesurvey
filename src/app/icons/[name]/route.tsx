import { ImageResponse } from "next/og";

// PWA icons rendered at build time, so the repo needs no binary assets.
// "maskable" keeps the logo inside the 80% safe zone because Android crops it to a shape.
const VARIANTS = {
  "192": { size: 192, safe: 1 },
  "512": { size: 512, safe: 1 },
  "512-maskable": { size: 512, safe: 0.72 },
} as const;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((name) => ({ name }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const v = VARIANTS[name as keyof typeof VARIANTS];
  if (!v) return new Response("Not found", { status: 404 });
  const font = Math.round(v.size * 0.3 * v.safe);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f1f3d 0%, #1e3456 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: `${Math.round(v.size * 0.06 * v.safe)}px ${Math.round(v.size * 0.1 * v.safe)}px`,
            border: `${Math.max(2, Math.round(v.size * 0.012))}px solid rgba(245,158,11,0.5)`,
            borderRadius: Math.round(v.size * 0.1),
            background: "rgba(245,158,11,0.12)",
            color: "#f59e0b",
            fontSize: font,
            fontWeight: 700,
            letterSpacing: 2,
          }}
        >
          GS IT
        </div>
      </div>
    ),
    { width: v.size, height: v.size },
  );
}
