import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getOwnCard } from "@/server/cards";
import { NotFoundError } from "@/server/errors";
import { cardUrl } from "@/server/links";
import { qrPng, qrSvg } from "@/server/qr";

/** Downloads a card's QR code (SVG or PNG). Owner only. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/cards/[id]/qr">) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return new Response("Sign in to download QR codes.", { status: 401 });
  const { id } = await ctx.params;
  let token: string;
  try {
    token = (await getOwnCard(session.user.id, id)).token;
  } catch (error) {
    if (error instanceof NotFoundError) return new Response("Not found", { status: 404 });
    throw error;
  }
  const format = request.nextUrl.searchParams.get("format") === "png" ? "png" : "svg";
  const url = cardUrl(token);
  const common = {
    "Cache-Control": "private, no-store",
    "Content-Disposition": `attachment; filename="card-qr-${token.slice(0, 6)}.${format}"`,
  };
  if (format === "png") {
    return new Response(new Uint8Array(await qrPng(url)), { headers: { ...common, "Content-Type": "image/png" } });
  }
  return new Response(await qrSvg(url), { headers: { ...common, "Content-Type": "image/svg+xml" } });
}
