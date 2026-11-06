/**
 * Create or update a login.
 *
 *   npm run seed:user -- boss@globalsurf.ae "S3cret-pass-1" "Boss Name" super_admin
 *   npm run seed:user -- lead@globalsurf.ae "S3cret-pass-1" "Lead Name" lead av
 *   npm run seed:user -- eng@globalsurf.ae  "S3cret-pass-1" "Engineer Name" member elv
 *   npm run seed:user -- new@globalsurf.ae  "S3cret-pass-1" "Boss Name" super_admin --from=old@globalsurf.ae   (change an email in place)
 *
 * Roles: super_admin (all departments) · lead (team lead of <department>) · member (of <department>, default elv).
 * Departments are created on first start: elv, av, ict. Re-running for an existing email resets the password and role.
 */
import bcrypt from "bcryptjs";
import { departments, users } from "../src/lib/mongo";

const ROLES = ["super_admin", "lead", "member"] as const;
type R = (typeof ROLES)[number];
const args = process.argv.slice(2);
// Optional `--from=<old email>`: change that account's email in place, so its surveys and history stay with it.
const fromEmail = args.find((a) => a.startsWith("--from="))?.slice("--from=".length).trim().toLowerCase();
const [email, password, name, roleArg = "member", deptArg = "elv"] = args.filter((a) => !a.startsWith("--from="));
const role = roleArg as R;

if (!email || !password || !name || !ROLES.includes(role)) {
  console.error('usage: npm run seed:user -- <email> <password> "<full name>" [super_admin|lead|member] [department id, default elv]');
  process.exit(1);
}
if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

async function main() {
  const dept = deptArg.toLowerCase();
  if (role !== "super_admin" && !(await (await departments()).findOne({ _id: dept }))) {
    throw new Error(`Department “${dept}” does not exist. Create it in the app first (or use elv, av, ict).`);
  }
  const col = await users();
  const key = email.trim().toLowerCase();
  if (fromEmail && fromEmail !== key) {
    if (await col.findOne({ email: key })) throw new Error(`${key} already exists. Re-run without --from to update it.`);
    const renamed = await col.updateOne({ email: fromEmail }, { $set: { email: key } });
    if (!renamed.matchedCount) throw new Error(`No account with the email ${fromEmail}.`);
    console.log(`Changed the email ${fromEmail} → ${key}`);
  }
  const memberships = role === "super_admin" ? [] : [{ departmentId: dept, role: role === "lead" ? ("lead" as const) : ("member" as const) }];

  if (role === "lead") {
    // One lead per department: demote whoever held it.
    await col.updateMany({ email: { $ne: key } }, { $set: { "memberships.$[m].role": "member" } }, { arrayFilters: [{ "m.departmentId": dept, "m.role": "lead" }] });
  }
  const res = await col.updateOne(
    { email: key },
    {
      $set: { name, role: role === "super_admin" ? "super_admin" : "user", memberships, passwordHash: await bcrypt.hash(password, 12) },
      $setOnInsert: { createdAt: Date.now() },
    },
    { upsert: true },
  );
  console.log(`${res.upsertedCount ? "Created" : "Updated"} ${role}${role === "super_admin" ? "" : ` of ${dept}`}: ${email}`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  },
);
