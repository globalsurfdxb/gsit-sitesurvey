import { Readable } from "node:stream";
import { z } from "zod";
import { canViewSurvey } from "@/lib/access";
import { HttpError, route } from "@/lib/api";
import { extOf, FILE_TYPES } from "@/lib/files";
import { filesBucket, fileDocs, surveys } from "@/lib/mongo";

export const dynamic = "force-dynamic";

const ID = z.string().regex(/^[A-Za-z0-9-]{8,64}$/);

export const GET = route<{ id: string }>(async (_req, { user, params }) => {
  const id = ID.parse(params.id);
  const doc = await (await fileDocs()).findOne({ _id: id });
  if (!doc) throw new HttpError(404, "File not found");
  // The owner, a super admin, or the lead of the department the survey belongs to.
  const survey = doc.metadata?.surveyId ? await (await surveys()).findOne({ _id: doc.metadata.surveyId }, { projection: { ownerId: 1, departmentId: 1 } }) : null;
  const ref = { ownerId: survey?.ownerId ?? doc.metadata?.ownerId ?? "", departmentId: survey?.departmentId };
  if (!canViewSurvey(user, ref)) throw new HttpError(403, "You can't open this file");

  const type = FILE_TYPES[extOf(doc.filename)] ?? { mime: "application/octet-stream", inline: false };
  const safeName = doc.filename.replace(/[^\w.\- ]+/g, "_");
  const body = Readable.toWeb((await filesBucket()).openDownloadStream(id as never)) as ReadableStream;
  return new Response(body, {
    headers: {
      "Content-Type": type.mime,
      "Content-Length": String(doc.length),
      "Content-Disposition": `${type.inline ? "inline" : "attachment"}; filename="${safeName}"`,
      "X-Content-Type-Options": "nosniff",
      // File ids are random UUIDs and content never changes, so the browser may keep it.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
});
