import { jwtVerify, SignJWT } from "jose";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { normalizeRole } from "./access";
import type { SessionUser } from "./types";
import { users, type UserDoc } from "./mongo";

export const SESSION_COOKIE = "gs_session";
export const SESSION_DAYS = 30;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (at least 32 characters). See .env.example.");
  return new TextEncoder().encode(s);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub) return null;
    // Memberships aren't in the token (they change); getCurrentUser reads them from the database.
    return { id: payload.sub, name: String(payload.name), email: String(payload.email), role: normalizeRole(payload.role), memberships: [] };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};

/**
 * The signed session identifies the user; the database is re-checked so that a deleted
 * account or changed role takes effect immediately rather than at token expiry.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session || !ObjectId.isValid(session.id)) return null;
  const doc = await (await users()).findOne({ _id: new ObjectId(session.id) });
  if (!doc) return null;
  return toSessionUser(doc);
}

export function toSessionUser(doc: UserDoc): SessionUser {
  return { id: doc._id.toHexString(), name: doc.name, email: doc.email, role: normalizeRole(doc.role), memberships: doc.memberships ?? [] };
}
