import { json, publicRoute } from "@/lib/api";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export const POST = publicRoute(async () => {
  const res = json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return res;
});
