import { isSuperAdmin, ledDepartments } from "@/lib/access";
import { json, route } from "@/lib/api";
import { surveys } from "@/lib/mongo";
import type { SurveySummary } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Lightweight list used by the client to decide what to pull.
 * Members see their own surveys; a team lead also sees their department's; a super admin sees all.
 */
export const GET = route(async (_req, { user }) => {
  const led = ledDepartments(user);
  const filter = isSuperAdmin(user) ? {} : led.length ? { $or: [{ ownerId: user.id }, { departmentId: { $in: led } }] } : { ownerId: user.id };
  const docs = await (await surveys())
    .find(filter, { projection: { title: 1, status: 1, rev: 1, updatedAt: 1, ownerName: 1, departmentId: 1, formId: 1 } })
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
    departmentId: d.departmentId,
    formId: d.formId,
  }));
  return json({ surveys: list });
});
