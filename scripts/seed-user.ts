/**
 * Create or update a login.
 *
 *   npm run seed:user -- engineer@globalsurf.ae "S3cret-pass" "Engineer Name" [engineer|admin]
 */
import bcrypt from "bcryptjs";
import { users } from "../src/lib/mongo";

const [email, password, name, role = "engineer"] = process.argv.slice(2);
if (!email || !password || !name || !["engineer", "admin"].includes(role)) {
  console.error('usage: npm run seed:user -- <email> <password> "<full name>" [engineer|admin]');
  process.exit(1);
}
if (password.length < 10) {
  console.error("Password must be at least 10 characters.");
  process.exit(1);
}

async function main() {
  const col = await users();
  const res = await col.updateOne(
    { email: email.trim().toLowerCase() },
    {
      $set: { name, role: role as "engineer" | "admin", passwordHash: await bcrypt.hash(password, 12) },
      $setOnInsert: { createdAt: Date.now() },
    },
    { upsert: true },
  );
  console.log(res.upsertedCount ? `Created ${role} ${email}` : `Updated ${email}`);
}

main().then(
  () => process.exit(0),
  (e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  },
);
