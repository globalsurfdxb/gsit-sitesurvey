import { z } from "zod";
import { isSuperAdmin } from "@/lib/access";
import { HttpError, json, route } from "@/lib/api";
import { PICKABLE_ICONS, TONES } from "@/lib/form-schema";
import { departments, forms, surveys, users } from "@/lib/mongo";

export const dynamic = "force-dynamic";

const ID = z.string().regex(/^[a-z0-9-]{2,12}$/);

const patchBody = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  description: z.string().trim().max(300).optional(),
  tone: z.enum(TONES).optional(),
  iconName: z.enum(PICKABLE_ICONS).optional(),
});

/** Rename or restyle a department (super admin). The code and id stay fixed. */
export const PATCH = route<{ id: string }>(async (req, { user, params }) => {
  if (!isSuperAdmin(user)) throw new HttpError(403, "Only a super admin can edit departments");
  const id = ID.parse(params.id);
  const body = patchBody.parse(await req.json().catch(() => ({})));
  if (Object.keys(body).length === 0) return json({ ok: true });
  const res = await (await departments()).updateOne({ _id: id }, { $set: body });
  if (res.matchedCount === 0) throw new HttpError(404, "Department not found");
  return json({ ok: true });
});

/** Delete an empty department (super admin): no surveys. Its forms go with it and members are detached. */
export const DELETE = route<{ id: string }>(async (_req, { user, params }) => {
  if (!isSuperAdmin(user)) throw new HttpError(403, "Only a super admin can delete departments");
  const id = ID.parse(params.id);
  if (await (await surveys()).findOne({ departmentId: id }, { projection: { _id: 1 } })) {
    throw new HttpError(409, "This department has surveys. Delete or move them first.", { code: "has-surveys" });
  }
  const res = await (await departments()).deleteOne({ _id: id });
  if (res.deletedCount === 0) throw new HttpError(404, "Department not found");
  await (await forms()).deleteMany({ departmentId: id });
  await (await users()).updateMany({}, { $pull: { memberships: { departmentId: id } } });
  return json({ ok: true });
});
