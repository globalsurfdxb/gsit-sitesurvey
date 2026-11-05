import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "./auth";
import type { SessionUser } from "./types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public extra?: Record<string, unknown>,
  ) {
    super(message);
  }
}

export const json = (data: unknown, init?: ResponseInit) => NextResponse.json(data, init);

/** State-changing requests must come from our own origin (defence in depth next to SameSite=Lax). */
function assertSameOrigin(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "Bad origin");
  }
  if (originHost !== host) throw new HttpError(403, "Cross-origin request blocked");
}

type Ctx<P> = { params: Promise<P> };

/** Wrap a route handler: origin check, optional auth, uniform error responses. */
export function route<P = Record<string, never>>(
  handler: (req: NextRequest, ctx: { user: SessionUser; params: P }) => Promise<Response>,
) {
  return wrap<P>(true, (req, ctx) => handler(req, { user: ctx.user!, params: ctx.params }));
}

/** Same wrapper without the sign-in requirement (login only). */
export function publicRoute<P = Record<string, never>>(handler: (req: NextRequest, ctx: { params: P }) => Promise<Response>) {
  return wrap<P>(false, (req, ctx) => handler(req, { params: ctx.params }));
}

function wrap<P>(requireAuth: boolean, handler: (req: NextRequest, ctx: { user: SessionUser | null; params: P }) => Promise<Response>) {
  return async (req: NextRequest, context: Ctx<P>): Promise<Response> => {
    try {
      assertSameOrigin(req);
      let user: SessionUser | null = null;
      if (requireAuth) {
        user = await getCurrentUser();
        if (!user) throw new HttpError(401, "Not signed in");
      }
      const params = (await context?.params) ?? ({} as P);
      return await handler(req, { user, params });
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, ...e.extra }, { status: e.status });
      if (e instanceof ZodError) return json({ error: "Invalid request", issues: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 });
      console.error("[api]", req.method, req.nextUrl.pathname, e);
      return json({ error: "Server error" }, { status: 500 });
    }
  };
}
