import type { Db } from "mongodb";
import { ELV_DEPARTMENT_ID, ELV_FORM, ELV_FORM_ID } from "./elv-form";

/**
 * Runs once per server process (after indexes). Idempotent and never overwrites an administrator's edits.
 *
 *  1. First start only: create the ELV, AV and ICT departments and the ELV form (the original checklist).
 *  2. Every start: bring accounts and surveys from before departments existed up to date.
 *       - role "admin" → "super_admin", "engineer" → "user"
 *       - engineers with no memberships field → members of ELV (where all surveys used to belong)
 *       - surveys with no department → the ELV department and form
 */
export async function ensureSeed(db: Db) {
  const meta = db.collection<{ _id: string; at: number }>("meta");
  if (!(await meta.findOne({ _id: "seed-departments" }))) {
    const now = Date.now();
    const departments = db.collection("departments");
    const defaults = [
      { _id: ELV_DEPARTMENT_ID, name: "ELV", code: "ELV", description: "Extra low voltage: cabling, CCTV, access control, networking.", tone: "blue", iconName: "plug" },
      { _id: "av", name: "AV", code: "AV", description: "Audio visual: displays, conferencing, sound and control systems.", tone: "purple", iconName: "monitor" },
      { _id: "ict", name: "ICT", code: "ICT", description: "Information and communication technology: infrastructure, devices, security.", tone: "teal", iconName: "cpu" },
    ];
    for (const d of defaults) await departments.updateOne({ _id: d._id as never }, { $setOnInsert: { ...d, createdAt: now } }, { upsert: true });
    await db.collection("forms").updateOne(
      { _id: ELV_FORM_ID as never },
      {
        $setOnInsert: {
          departmentId: ELV_DEPARTMENT_ID,
          name: ELV_FORM.title,
          description: ELV_FORM.subtitle,
          status: "active",
          version: 1,
          schema: JSON.parse(JSON.stringify(ELV_FORM)),
          createdAt: now,
          updatedAt: now,
          updatedBy: "system",
        },
      },
      { upsert: true },
    );
    await meta.updateOne({ _id: "seed-departments" }, { $setOnInsert: { at: now } }, { upsert: true });
  }

  const users = db.collection("users");
  await users.updateMany({ role: "admin" }, { $set: { role: "super_admin" } });
  await users.updateMany({ role: "engineer" }, { $set: { role: "user" } });
  await users.updateMany({ role: "user", memberships: { $exists: false } }, { $set: { memberships: [{ departmentId: ELV_DEPARTMENT_ID, role: "member" }] } });
  await users.updateMany({ role: "super_admin", memberships: { $exists: false } }, { $set: { memberships: [] } });

  await db.collection("surveys").updateMany({ departmentId: { $exists: false } }, { $set: { departmentId: ELV_DEPARTMENT_ID, formId: ELV_FORM_ID } });
}
