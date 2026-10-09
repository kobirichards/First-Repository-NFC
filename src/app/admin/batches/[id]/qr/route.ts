import type { NextRequest } from "next/server";
import { batchQrZip } from "@/server/admin";
import { adminActorOrNull } from "@/server/admin/route-guard";

export async function GET(_request: NextRequest, ctx: RouteContext<"/admin/batches/[id]/qr">) {
  const actor = await adminActorOrNull();
  if (!actor) return new Response("Not found", { status: 404 });
  const result = await batchQrZip(actor, (await ctx.params).id);
  if (!result) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(result.zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${result.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
