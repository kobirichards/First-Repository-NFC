import type { NextRequest } from "next/server";
import { getArtworkFile } from "@/server/admin";
import { adminActorOrNull } from "@/server/admin/route-guard";

export async function GET(_request: NextRequest, ctx: RouteContext<"/admin/artwork/[...key]">) {
  const actor = await adminActorOrNull();
  if (!actor) return new Response("Not found", { status: 404 });
  const file = await getArtworkFile(actor, `artwork/${(await ctx.params).key.join("/")}`);
  if (!file) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.body), {
    headers: { "Content-Type": file.contentType, "Cache-Control": "private, no-store", "Content-Security-Policy": "default-src 'none'" },
  });
}
