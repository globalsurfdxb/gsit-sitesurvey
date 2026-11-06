/**
 * Create (or reset) three test logins on whatever database MONGODB_URI points at: a super admin,
 * a team lead and a team member. Use it to try the online deployment.
 *
 *   npm run seed:test -- "<password>" [department id, default elv]
 *
 * Point it at the online database by setting the same MONGODB_URI / MONGODB_DB you gave Vercel:
 *   PowerShell:  $env:MONGODB_URI="mongodb+srv://..."; $env:MONGODB_DB="site_survey"; npm run seed:test -- "Test@Pass-2026"
 *   bash:        MONGODB_URI="mongodb+srv://..." MONGODB_DB=site_survey npm run seed:test -- "Test@Pass-2026"
 * Variables already set in the shell win over .env.local. The script prints which database it used
 * (host and name only, never the credentials). Re-running resets the passwords. Delete the accounts
 * from the app (Departments → person → Remove) once testing is over.
 */
import bcrypt from "bcryptjs";
import { departments, users } from "../src/lib/mongo";

const [password, deptArg = "elv"] = process.argv.slice(2);
if (!password || password.length < 10) {
  console.error('usage: npm run seed:test -- "<password, at least 10 characters>" [department id, default elv]');
  process.exit(1);
}

const ACCOUNTS = [
  { email: "muneer@gs-it.ae", name: "Muneer", kind: "super_admin" },
  { email: "teamlead@gs-it.ae", name: "Test Team Lead", kind: "lead" },
  { email: "engineer@gs-it.ae", name: "Test Engineer", kind: "member" },
] as const;

function target() {
  try {
    return `${new URL(process.env.MONGODB_URI ?? "").hostname} / ${process.env.MONGODB_DB || "site_survey"}`;
  } catch {
    return "(unreadable MONGODB_URI)";
  }
}

async function main() {
  const dept = deptArg.toLowerCase();
  console.log(`Database: ${target()}`);
  if (!(await (await departments()).findOne({ _id: dept }))) throw new Error(`Department “${dept}” does not exist (use elv, av or ict).`);

  const col = await users();
  const passwordHash = await bcrypt.hash(password, 12);
  for (const a of ACCOUNTS) {
    if (a.kind === "lead") {
      // One lead per department: demote whoever held it.
      await col.updateMany({ email: { $ne: a.email } }, { $set: { "memberships.$[m].role": "member" } }, { arrayFilters: [{ "m.departmentId": dept, "m.role": "lead" }] });
    }
    const memberships = a.kind === "super_admin" ? [] : [{ departmentId: dept, role: a.kind === "lead" ? ("lead" as const) : ("member" as const) }];
    const res = await col.updateOne(
      { email: a.email },
      { $set: { name: a.name, role: a.kind === "super_admin" ? "super_admin" : "user", memberships, passwordHash }, $setOnInsert: { createdAt: Date.now() } },
      { upsert: true },
    );
    console.log(`${res.upsertedCount ? "Created" : "Updated"} ${a.kind.padEnd(11)} ${a.email}`);
  }
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  },
);
