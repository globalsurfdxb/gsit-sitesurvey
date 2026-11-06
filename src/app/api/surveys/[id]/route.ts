import { z } from "zod";
import { canCreateIn, canEditSurvey, canViewSurvey } from "@/lib/access";
import { HttpError, json, route } from "@/lib/api";
import { ELV_DEPARTMENT_ID, ELV_FORM_ID } from "@/lib/elv-form";
import { filesBucket, fileDocs, forms, surveys, type SurveyDoc } from "@/lib/mongo";
import { collectFileRefs, surveyTitle } from "@/lib/survey";
import type { ServerSurvey } from "@/lib/types";

export const dynamic = "force-dynamic";

const ID = z.string().regex(/^[A-Za-z0-9-]{8,64}$/);
const MAX_VALUES_BYTES = 1_000_000; // values hold references only; binaries live in GridFS

const putBody = z.object({
  values: z.record(z.string(), z.unknown()),
  status: z.enum(["draft", "submitted"]),
  baseRev: z.number().int().min(0),
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
  force: z.boolean().optional(),
  // Only read when the survey is first created. Clients from before departments existed omit them (= ELV).
  departmentId: z.string().regex(/^[a-z0-9-]{2,12}$/).optional(),
  formId: z.string().regex(/^[A-Za-z0-9_-]{3,80}$/).optional(),
});

const toApi = (d: SurveyDoc): ServerSurvey => ({
  id: d._id,
  ownerId: d.ownerId,
  ownerName: d.ownerName,
  departmentId: d.departmentId,
  formId: d.formId,
  status: d.status,
  values: d.values,
  rev: d.rev,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
  submittedAt: d.submittedAt,
});

/** The title is derived from the survey's form (which fields are the reference and client). */
async function titleFor(formId: string, values: Record<string, unknown>) {
  const form = await (await forms()).findOne({ _id: formId }, { projection: { schema: 1 } });
  return surveyTitle(form?.schema, values).slice(0, 200);
}

export const GET = route<{ id: string }>(async (_req, { user, params }) => {
  const id = ID.parse(params.id);
  const doc = await (await surveys()).findOne({ _id: id });
  if (!doc) throw new HttpError(404, "Survey not found");
  if (!canViewSurvey(user, doc)) throw new HttpError(403, "You can't open this survey");
  return json({ survey: toApi(doc) });
});

export const PUT = route<{ id: string }>(async (req, { user, params }) => {
  const id = ID.parse(params.id);
  const raw = await req.text();
  if (raw.length > MAX_VALUES_BYTES) throw new HttpError(413, "Survey data too large");
  const body = putBody.parse(JSON.parse(raw));
  const col = await surveys();
  const now = Date.now();
  const existing = await col.findOne({ _id: id });

  if (!existing) {
    if (body.baseRev !== 0) throw new HttpError(409, "Survey was deleted on the server", { code: "gone" });
    const formId = body.formId ?? ELV_FORM_ID;
    const form = await (await forms()).findOne({ _id: formId }, { projection: { departmentId: 1 } });
    if (!form) throw new HttpError(400, "That form no longer exists", { code: "no-form" });
    const departmentId = body.departmentId ?? (formId === ELV_FORM_ID ? ELV_DEPARTMENT_ID : form.departmentId);
    if (form.departmentId !== departmentId) throw new HttpError(400, "That form doesn't belong to this department", { code: "bad-form" });
    if (!canCreateIn(user, departmentId)) throw new HttpError(403, "You're not a member of this department", { code: "not-member" });

    const doc: SurveyDoc = {
      _id: id,
      ownerId: user.id,
      ownerName: user.name,
      departmentId,
      formId,
      title: await titleFor(formId, body.values),
      status: body.status,
      values: body.values,
      rev: 1,
      createdAt: body.createdAt,
      updatedAt: body.updatedAt,
      ...(body.status === "submitted" ? { submittedAt: now } : {}),
    };
    try {
      await col.insertOne(doc);
    } catch (e) {
      if ((e as { code?: number }).code === 11000) throw new HttpError(409, "Survey already exists", { code: "conflict" });
      throw e;
    }
    return json({ rev: 1, updatedAt: doc.updatedAt });
  }

  if (!canEditSurvey(user, existing)) throw new HttpError(403, "Only the owner can change this survey");
  if (body.baseRev !== existing.rev && !body.force) {
    throw new HttpError(409, "Survey changed on the server", { code: "conflict", server: toApi(existing) });
  }

  // Compare-and-swap on rev so two devices can't silently overwrite each other.
  const res = await col.updateOne(
    { _id: id, rev: existing.rev },
    {
      $set: {
        title: await titleFor(existing.formId, body.values),
        status: body.status,
        values: body.values,
        updatedAt: body.updatedAt,
        ...(body.status === "submitted" && existing.status !== "submitted" ? { submittedAt: now } : {}),
      },
      $inc: { rev: 1 },
    },
  );
  if (res.matchedCount === 0) throw new HttpError(409, "Survey changed on the server", { code: "conflict" });

  await dropUnreferencedFiles(id, body.values).catch((e) => console.error("[api] file cleanup failed", e));
  return json({ rev: existing.rev + 1, updatedAt: body.updatedAt });
});

export const DELETE = route<{ id: string }>(async (_req, { user, params }) => {
  const id = ID.parse(params.id);
  const col = await surveys();
  const doc = await col.findOne({ _id: id });
  if (!doc) return json({ ok: true });
  if (!canEditSurvey(user, doc)) throw new HttpError(403, "Only the owner can delete this survey");
  await col.deleteOne({ _id: id });
  await dropUnreferencedFiles(id, {}).catch((e) => console.error("[api] file cleanup failed", e));
  return json({ ok: true });
});

/** Remove GridFS files of this survey that its values no longer reference. */
async function dropUnreferencedFiles(surveyId: string, values: Record<string, unknown>) {
  const keep = new Set(collectFileRefs(values).map((f) => f.id));
  const stale = await (await fileDocs()).find({ "metadata.surveyId": surveyId }, { projection: { _id: 1 } }).toArray();
  const bucket = await filesBucket();
  for (const f of stale) if (!keep.has(f._id)) await bucket.delete(f._id as never).catch(() => undefined);
}
