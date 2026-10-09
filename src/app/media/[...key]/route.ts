import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { canViewPhoto } from "@/server/profiles";
import { getStorage } from "@/server/storage";

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

/** Serves profile photos with the profile's visibility rules applied. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/media/[...key]">) {
  const key = (await ctx.params).key.join("/");
  if (!/^profile\/[A-Za-z0-9_-]+\.webp$/.test(key)) return notFound();

  let access = await canViewPhoto(key, null);
  if (!access) {
    const session = await auth.api.getSession({ headers: await headers() });
    access = await canViewPhoto(key, session?.user.id ?? null);
  }
  if (!access) return notFound();

  const object = await getStorage().get(key);
  if (!object) return notFound();
  return new Response(new Uint8Array(object.body), {
    headers: {
      "Content-Type": object.contentType,
      // Keys change whenever the photo changes, but visibility can change too, so keep public caching short.
      "Cache-Control": access === "public" ? "public, max-age=300" : "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
