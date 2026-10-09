import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { publicProfileExists } from "@/server/profiles";
import { checkLimit, clientKey } from "@/server/rate-limit";

/**
 * 1. Rate-limits the public card and profile URLs (/c/, /p/).
 * 2. Sends a real 404 for unknown or unpublished profiles. The profile page
 *    streams, and once streaming starts its status is already 200.
 * 3. Optimistic check for /dashboard and /admin: visitors without a session
 *    cookie go to sign-in before anything renders. Every page and action
 *    still verifies the session itself; this is not an authorization layer.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/c/") || pathname.startsWith("/p/")) {
    const result = await checkLimit("publicPerClient", clientKey(request.headers));
    if (!result.ok) {
      return new NextResponse("Too many requests. Wait a moment and try again.", {
        status: 429,
        headers: { "Retry-After": String(result.retryAfter), "Cache-Control": "no-store" },
      });
    }
    if (pathname.startsWith("/p/") && !pathname.endsWith("/vcard")) {
      const match = /^\/p\/([a-z0-9-]{1,40})\/?$/.exec(pathname);
      if (!match || !(await publicProfileExists(match[1]))) {
        // Rewriting to a path no route matches renders app/not-found.tsx with a 404 status.
        return NextResponse.rewrite(new URL("/_profile-not-found", request.url));
      }
    }
    return NextResponse.next();
  }

  if (!getSessionCookie(request)) {
    const url = new URL("/sign-in", request.url);
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/c/:path*", "/p/:path*"],
};
