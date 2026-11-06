import { z } from "zod";
import { canManageDepartment } from "@/lib/access";
import { HttpError, json, route } from "@/lib/api";
import { findFormProblems, formSchemaZ } from "@/lib/form-schema";
import { forms, surveys } from "@/lib/mongo";
import type { FormSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

const ID = z.string().regex(/^[A-Za-z0-9_-]{3,80}$/);
const MAX_BYTES = 1_500_000;

const putBody = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(300).default(""),
  status: z.enum(["active", "archived"]),
  schema: formSchemaZ,
  /** The version the editor started from; a mismatch means someone else saved first. */
  baseVersion: z.number().int().min(1),
});

async function load(id: string) {
  const doc = await (await forms()).findOne({ _id: id });
  if (!doc) throw new HttpError(404, "Form not found");
  return doc;
}

export const GET = route<{ id: string }>(async (_req, { user, params }) => {
  const doc = await load(ID.parse(params.id));
  if (!canManageDepartment(user, doc.departmentId) && !user.memberships.some((m) => m.departmentId === doc.departmentId)) throw new HttpError(403, "Not your department's form");
  return json({ form: { id: doc._id, departmentId: doc.departmentId, name: doc.name, description: doc.description, status: doc.status, version: doc.version, updatedAt: doc.updatedAt, schema: doc.schema } });
});

/** Save the form builder's changes (department lead or super admin). Bumps the version. */
export const PUT = route<{ id: string }>(async (req, { user, params }) => {
  const id = ID.parse(params.id);
  const raw = await req.text();
  if (raw.length > MAX_BYTES) throw new HttpError(413, "Form definition too large");
  const doc = await load(id);
  if (!canManageDepartment(user, doc.departmentId)) throw new HttpError(403, "You don't manage this department");
  const b = putBody.parse(JSON.parse(raw)); // authorise before looking at the payload
  if (b.baseVersion !== doc.version) throw new HttpError(409, "Someone else saved this form first. Reload to see their changes.", { code: "conflict", version: doc.version });

  const schema = b.schema as FormSchema;
  const problems = findFormProblems(schema);
  if (problems.length) throw new HttpError(400, problems[0], { problems });

  const res = await (await forms()).updateOne(
    { _id: id, version: doc.version },
    { $set: { name: b.name, description: b.description, status: b.status, schema, updatedAt: Date.now(), updatedBy: user.id }, $inc: { version: 1 } },
  );
  if (res.matchedCount === 0) throw new HttpError(409, "Someone else saved this form first. Reload to see their changes.", { code: "conflict" });
  return json({ version: doc.version + 1 });
});

/** Delete a form nobody has used. Forms with surveys are archived instead, so those surveys keep their layout. */
export const DELETE = route<{ id: string }>(async (_req, { user, params }) => {
  const id = ID.parse(params.id);
  const doc = await load(id);
  if (!canManageDepartment(user, doc.departmentId)) throw new HttpError(403, "You don't manage this department");
  if (await (await surveys()).findOne({ formId: id }, { projection: { _id: 1 } })) {
    throw new HttpError(409, "Surveys use this form. Archive it instead so existing surveys keep working.", { code: "has-surveys" });
  }
  await (await forms()).deleteOne({ _id: id });
  return json({ ok: true });
});
