import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProfileView } from "@/components/profile/profile-view";
import { photoUrl } from "@/server/links";
import { ensureOwnProfile, toPublicProfile } from "@/server/profiles";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Preview your profile", robots: { index: false } };

async function Preview() {
  const user = await requireUser("/dashboard/profile/preview");
  const own = await ensureOwnProfile(user.id, user.name);
  // Same filtering and same component as the public page, so this is exactly what visitors see.
  const profile = toPublicProfile(own);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-stone bg-sheet px-5 py-4">
        <p className="text-sm">
          <strong className="font-semibold">Preview.</strong> This is what people see when they tap your card
          {own.isPublished ? "." : ", once you publish."}
        </p>
        <Link href="/dashboard/profile" className="text-sm font-semibold text-bottle underline-offset-4 hover:underline">
          Back to editing
        </Link>
      </div>
      <div className="mx-auto w-full max-w-sm overflow-hidden rounded-[2rem] border-[6px] border-ink bg-paper pb-10">
        <ProfileView
          profile={profile}
          photoSrc={profile.photoKey ? photoUrl(profile.photoKey) : null}
          vcardHref={own.isPublished ? `/p/${own.slug}/vcard` : null}
        />
      </div>
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<p className="text-moss">Loading preview…</p>}>
      <Preview />
    </Suspense>
  );
}
