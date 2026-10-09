import { after, NextResponse, type NextRequest } from "next/server";
import { env } from "@/config/env";
import { recordTap } from "@/server/analytics";
import { resolveCardToken } from "@/server/cards";

/**
 * The URL on every chip and QR code. Always a temporary redirect with
 * no-store, so a change of destination applies on the very next tap.
 * (A 301/308 would be cached by phones and freeze the old destination.)
 * Rate limiting for /c/ and /p/ is applied in src/proxy.ts.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/c/[token]">) {
  const { token } = await ctx.params;
  const result = await resolveCardToken(token);

  let location: string;
  switch (result.kind) {
    case "redirect": {
      const { cardId } = result;
      const ua = request.headers.get("user-agent");
      // Counted after the response is sent, so the redirect is never slowed down.
      after(() => recordTap(cardId, ua));
      location = result.location.startsWith("/") ? `${env.appUrl}${result.location}` : result.location;
      break;
    }
    case "unclaimed":
      location = `${env.appUrl}/activate/${encodeURIComponent(token)}`;
      break;
    case "not-ready":
      location = `${env.appUrl}/card/not-ready`;
      break;
    case "inactive":
      location = `${env.appUrl}/card/inactive`;
      break;
  }

  const response = NextResponse.redirect(location, 307);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("X-Robots-Tag", "noindex");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
