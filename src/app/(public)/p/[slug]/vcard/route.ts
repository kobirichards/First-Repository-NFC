import sharp from "sharp";
import type { NextRequest } from "next/server";
import { buildVCard, vcardFilename } from "@/lib/vcard";
import { profileUrl } from "@/server/links";
import { getPublicProfileBySlug } from "@/server/profiles";
import { getStorage } from "@/server/storage";

/** "Save contact": a vCard built server-side from public fields only. */
export async function GET(_request: NextRequest, ctx: RouteContext<"/p/[slug]/vcard">) {
  const { slug } = await ctx.params;
  const profile = await getPublicProfileBySlug(slug);
  if (!profile) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

  let photo: { base64: string; type: "JPEG" } | null = null;
  if (profile.photoKey) {
    const object = await getStorage().get(profile.photoKey).catch(() => null);
    if (object) {
      const jpeg = await sharp(object.body).resize(256, 256).jpeg({ quality: 80 }).toBuffer();
      photo = { base64: jpeg.toString("base64"), type: "JPEG" };
    }
  }

  const body = buildVCard({
    displayName: profile.displayName,
    jobTitle: profile.jobTitle,
    company: profile.company,
    email: profile.email,
    phone: profile.phone,
    website: profile.website,
    linkedinUrl: profile.linkedinUrl,
    profileUrl: profileUrl(profile.slug),
    photo,
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${vcardFilename(profile.displayName)}"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
