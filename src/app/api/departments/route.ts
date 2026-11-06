import { z } from "zod";
import { isSuperAdmin } from "@/lib/access";
import { HttpError, json, route } from "@/lib/api";
import { PICKABLE_ICONS, TONES } from "@/lib/form-schema";
import { departments } from "@/lib/mongo";

export const dynamic = "force-dynamic";

const departmentBody = z.object({
  name: z.string().trim().min(2).max(60),
  code: z.string().trim().min(2).max(12).regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers and dashes"),
  description: z.string().trim().max(300).default(""),
  tone: z.enum(TONES).default("blue"),
  iconName: z.enum(PICKABLE_ICONS).default("briefcase"),
});

/** Create a department (super admin). Its id is the lower-cased code. */
export const POST = route(async (req, { user }) => {
  if (!isSuperAdmin(user)) throw new HttpError(403, "Only a super admin can create departments");
  const body = departmentBody.parse(await req.json().catch(() => ({})));
  const id = body.code.toLowerCase();
  try {
    await (await departments()).insertOne({ _id: id, ...body, code: body.code.toUpperCase(), createdAt: Date.now() });
  } catch (e) {
    if ((e as { code?: number }).code === 11000) throw new HttpError(409, `A department with the code “${body.code.toUpperCase()}” already exists`);
    throw e;
  }
  return json({ id }, { status: 201 });
});
