import bcrypt from "bcryptjs";
import { z } from "zod";
import { canManageDepartment, isSuperAdmin } from "@/lib/access";
import { HttpError, json, route } from "@/lib/api";
import { departments, users } from "@/lib/mongo";

export const dynamic = "force-dynamic";

const ID = z.string().regex(/^[a-z0-9-]{2,12}$/);

const body = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  role: z.enum(["member", "lead"]).default("member"),
  /** Only needed when the email has no account yet: that creates one. */
  name: z.string().trim().min(2).max(80).optional(),
  password: z.string().min(10, "Password must be at least 10 characters").max(200).optional(),
});

/**
 * Add a person to a department. An existing account is simply added; otherwise an account is created
 * (name + temporary password required). Leads may add members; only a super admin may appoint the lead,
 * and a department has one lead, so appointing a new one makes the previous lead a member.
 */
export const POST = route<{ id: string }>(async (req, { user, params }) => {
  const deptId = ID.parse(params.id);
  if (!canManageDepartment(user, deptId)) throw new HttpError(403, "You don't manage this department");
  const b = body.parse(await req.json().catch(() => ({})));
  if (b.role === "lead" && !isSuperAdmin(user)) throw new HttpError(403, "Only a super admin can appoint a team lead");
  if (!(await (await departments()).findOne({ _id: deptId }, { projection: { _id: 1 } }))) throw new HttpError(404, "Department not found");

  const col = await users();
  let target = await col.findOne({ email: b.email });
  let created = false;
  if (!target) {
    if (!b.name || !b.password) throw new HttpError(400, "No account for that email yet. Enter a name and a temporary password to create one.", { code: "needs-account" });
    const doc = { email: b.email, name: b.name, role: "user" as const, memberships: [], passwordHash: await bcrypt.hash(b.password, 12), createdAt: Date.now() };
    const ins = await col.insertOne(doc as never);
    target = await col.findOne({ _id: ins.insertedId });
    created = true;
  }
  if (!target) throw new HttpError(500, "Could not create the account");

  if (b.role === "lead") await col.updateMany({ "memberships.departmentId": deptId, "memberships.role": "lead" }, { $set: { "memberships.$[m].role": "member" } }, { arrayFilters: [{ "m.departmentId": deptId, "m.role": "lead" }] });

  const already = (target.memberships ?? []).some((m) => m.departmentId === deptId);
  if (already) await col.updateOne({ _id: target._id }, { $set: { "memberships.$[m].role": b.role } }, { arrayFilters: [{ "m.departmentId": deptId }] });
  else await col.updateOne({ _id: target._id }, { $push: { memberships: { departmentId: deptId, role: b.role } } });

  return json({ id: target._id.toHexString(), created }, { status: created ? 201 : 200 });
});
