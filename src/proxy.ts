import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth";

/**
 * Gate everything except the login page and PWA plumbing behind a valid session cookie.
 * Pages are static shells (data lives in IndexedDB + the API), so this is the only place
 * page access is enforced; every API route additionally checks the user itself.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  const isLogin = pathname === "/login";
  const isLoginApi = pathname === "/api/auth/login" || pathname === "/api/auth/logout";

  if (isLoginApi) return NextResponse.next();
  if (session) return isLogin ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  if (isLogin) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const url = new URL("/login", req.url);
  if (pathname !== "/") url.searchParams.set("next", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  // Skip build assets and the files the browser must fetch without credentials.
  matcher: ["/((?!_next/|favicon.ico|manifest.webmanifest|sw.js|icons/|offline.html).*)"],
};
