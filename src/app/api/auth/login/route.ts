import bcrypt from "bcryptjs";
import { z } from "zod";
import { HttpError, json, publicRoute } from "@/lib/api";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/auth";
import { users } from "@/lib/mongo";

const body = z.object({ email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(1).max(200) });

// Naive in-memory throttle: 8 failures per email+IP per 15 minutes. Per-instance only;
// put a shared limiter (Redis / the platform's WAF) in front for a multi-instance deployment.
const fails = new Map<string, { n: number; reset: number }>();
const WINDOW = 15 * 60 * 1000;
const MAX_FAILS = 8;

// Compared against when the email is unknown, so that path costs the same as a wrong password.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

export const POST = publicRoute(async (req) => {
  const { email, password } = body.parse(await req.json().catch(() => ({})));
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const key = `${ip}|${email}`;
  const now = Date.now();
  const rec = fails.get(key);
  if (rec && rec.reset > now && rec.n >= MAX_FAILS) throw new HttpError(429, "Too many attempts. Try again in a few minutes.");

  const doc = await (await users()).findOne({ email });
  const ok = await bcrypt.compare(password, doc?.passwordHash ?? DUMMY_HASH);
  if (!doc || !ok) {
    fails.set(key, { n: rec && rec.reset > now ? rec.n + 1 : 1, reset: rec && rec.reset > now ? rec.reset : now + WINDOW });
    throw new HttpError(401, "Incorrect email or password");
  }
  fails.delete(key);

  const user = { id: doc._id.toHexString(), name: doc.name, email: doc.email, role: doc.role };
  const res = json({ user });
  res.cookies.set(SESSION_COOKIE, await signSession(user), sessionCookieOptions);
  return res;
});
