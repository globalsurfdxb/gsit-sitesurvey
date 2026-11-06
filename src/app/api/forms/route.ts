import { z } from "zod";
import { canManageDepartment } from "@/lib/access";
import { HttpError, json, route } from "@/lib/api";
import { blankForm } from "@/lib/form-schema";
import { departments, forms } from "@/lib/mongo";
import type { FormSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

const body = z.object({
  departmentId: z.string().regex(/^[a-z0-9-]{2,12}$/),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).default(""),
  /** Start as a copy of an existing form instead of a blank one. */
  copyFrom: z.string().max(80).optional(),
});

const newId = () => "f_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);

/** Create a form in a department (its lead or a super admin): blank, or a copy of another form. */
export const POST = route(async (req, { user }) => {
  const b = body.parse(await req.json().catch(() => ({})));
  if (!canManageDepartment(user, b.departmentId)) throw new HttpError(403, "You don't manage this department");
  if (!(await (await departments()).findOne({ _id: b.departmentId }, { projection: { _id: 1 } }))) throw new HttpError(404, "Department not found");

  const col = await forms();
  let schema: FormSchema = blankForm(b.name);
  if (b.copyFrom) {
    const src = await col.findOne({ _id: b.copyFrom });
    if (!src) throw new HttpError(404, "The form to copy was not found");
    // Copying across departments is allowed only for people who manage the source's department too.
    if (!canManageDepartment(user, src.departmentId)) throw new HttpError(403, "You can't copy a form from a department you don't manage");
    schema = { ...structuredClone(src.schema), title: b.name };
  }
  const now = Date.now();
  const id = newId();
  await col.insertOne({ _id: id, departmentId: b.departmentId, name: b.name, description: b.description, status: "active", version: 1, schema, createdAt: now, updatedAt: now, updatedBy: user.id });
  return json({ id }, { status: 201 });
});
