import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { canManageDepartment, isSuperAdmin } from "@/lib/access";
import { HttpError, json, route } from "@/lib/api";
import { users } from "@/lib/mongo";

export const dynamic = "force-dynamic";

const DEPT = z.string().regex(/^[a-z0-9-]{2,12}$/);

const patchBody = z.object({
  role: z.enum(["member", "lead"]).optional(),
  /** Reset the person's password (super admin only: the account may belong to other departments too). */
  password: z.string().min(10, "Password must be at least 10 characters").max(200).optional(),
});

async function targetUser(userId: string, deptId: string) {
  if (!ObjectId.isValid(userId)) throw new HttpError(404, "Member not found");
  const doc = await (await users()).findOne({ _id: new ObjectId(userId) });
  const m = doc?.memberships?.find((x) => x.departmentId === deptId);
  if (!doc || !m) throw new HttpError(404, "Member not found");
  return { doc, role: m.role };
}

/** Appoint or demote the team lead, or reset a password. Super admin only. */
export const PATCH = route<{ id: string; userId: string }>(async (req, { user, params }) => {
  const deptId = DEPT.parse(params.id);
  if (!isSuperAdmin(user)) throw new HttpError(403, "Only a super admin can change roles or passwords");
  const b = patchBody.parse(await req.json().catch(() => ({})));
  const { doc } = await targetUser(params.userId, deptId);
  const col = await users();
  if (b.role === "lead") {
    await col.updateMany({ "memberships.departmentId": deptId, "memberships.role": "lead" }, { $set: { "memberships.$[m].role": "member" } }, { arrayFilters: [{ "m.departmentId": deptId, "m.role": "lead" }] });
  }
  if (b.role) await col.updateOne({ _id: doc._id }, { $set: { "memberships.$[m].role": b.role } }, { arrayFilters: [{ "m.departmentId": deptId }] });
  if (b.password) await col.updateOne({ _id: doc._id }, { $set: { passwordHash: await bcrypt.hash(b.password, 12) } });
  return json({ ok: true });
});

/** Remove someone from the department. Their surveys stay; removing the lead needs a super admin. */
export const DELETE = route<{ id: string; userId: string }>(async (_req, { user, params }) => {
  const deptId = DEPT.parse(params.id);
  if (!canManageDepartment(user, deptId)) throw new HttpError(403, "You don't manage this department");
  const { doc, role } = await targetUser(params.userId, deptId);
  if (role === "lead" && !isSuperAdmin(user)) throw new HttpError(403, "Only a super admin can remove the team lead");
  await (await users()).updateOne({ _id: doc._id }, { $pull: { memberships: { departmentId: deptId } } });
  return json({ ok: true });
});
