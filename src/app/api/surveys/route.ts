import { json, route } from "@/lib/api";
import { surveys } from "@/lib/mongo";
import type { SurveySummary } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Lightweight list used by the client to decide what to pull. Engineers see their own; admins see all. */
export const GET = route(async (_req, { user }) => {
  const filter = user.role === "admin" ? {} : { ownerId: user.id };
  const docs = await (await surveys())
    .find(filter, { projection: { title: 1, status: 1, rev: 1, updatedAt: 1, ownerName: 1 } })
    .sort({ updatedAt: -1 })
    .limit(1000)
    .toArray();
  const list: SurveySummary[] = docs.map((d) => ({
    id: d._id,
    title: d.title,
    status: d.status,
    rev: d.rev,
    updatedAt: d.updatedAt,
    ownerName: d.ownerName,
  }));
  return json({ surveys: list });
});
