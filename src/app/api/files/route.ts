import { z } from "zod";
import { canEditSurvey } from "@/lib/access";
import { HttpError, json, route } from "@/lib/api";
import { extOf, FILE_TYPES, MAX_FILE_BYTES } from "@/lib/files";
import { filesBucket, fileDocs, surveys, type FileMeta } from "@/lib/mongo";
import { collectFileRefs } from "@/lib/survey";

export const dynamic = "force-dynamic";

const ID = z.string().regex(/^[A-Za-z0-9-]{8,64}$/);

/**
 * Upload one photo/attachment to GridFS (multipart: id, surveyId, file).
 * Idempotent on `id`, so a retry after a dropped connection is harmless. The survey must
 * already be on the server and must reference the file, which stops orphan uploads.
 */
export const POST = route(async (req, { user }) => {
  const form = await req.formData();
  const id = ID.parse(form.get("id"));
  const surveyId = ID.parse(form.get("surveyId"));
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Missing file");
  if (file.size === 0 || file.size > MAX_FILE_BYTES) throw new HttpError(413, "File must be between 1 byte and 15 MB");
  const type = FILE_TYPES[extOf(file.name)];
  if (!type) throw new HttpError(415, "File type not allowed");

  const survey = await (await surveys()).findOne({ _id: surveyId });
  if (!survey) throw new HttpError(409, "Sync the survey before its files", { code: "no-survey" });
  if (!canEditSurvey(user, survey)) throw new HttpError(403, "Only the owner can add files to this survey");
  if (!collectFileRefs(survey.values).some((f) => f.id === id)) throw new HttpError(409, "File is not referenced by the survey", { code: "unreferenced" });

  if (await (await fileDocs()).findOne({ _id: id }, { projection: { _id: 1 } })) return json({ ok: true, existing: true });

  const metadata: FileMeta = { surveyId, ownerId: survey.ownerId, departmentId: survey.departmentId, contentType: type.mime };
  const bytes = Buffer.from(await file.arrayBuffer());
  const bucket = await filesBucket();
  const stream = bucket.openUploadStreamWithId(id as never, file.name.slice(0, 200), { metadata });
  await new Promise<void>((resolve, reject) => {
    stream.once("error", reject).once("finish", () => resolve());
    stream.end(bytes);
  });
  return json({ ok: true });
});
