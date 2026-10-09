import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PhotoForm } from "@/components/dashboard/photo-form";
import { ProfileEditor } from "@/components/dashboard/profile-editor";
import { PublishToggle } from "@/components/dashboard/publish-toggle";
import { Notice } from "@/components/ui/notice";
import { env } from "@/config/env";
import { photoUrl } from "@/server/links";
import { ensureOwnProfile } from "@/server/profiles";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Your profile", robots: { index: false } };

async function Editor() {
  const user = await requireUser("/dashboard/profile");
  const profile = await ensureOwnProfile(user.id, user.name);
  const publicPath = `/p/${profile.slug}`;
  const initials = profile.displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your profile</h1>
          <p className="mt-2 text-moss">
            {profile.isPublished ? (
              <>
                Live at{" "}
                <Link href={publicPath} className="font-medium text-bottle underline-offset-4 hover:underline">
                  {env.appUrl.replace(/^https?:\/\//, "")}
                  {publicPath}
                </Link>
              </>
            ) : (
              "Not published yet. Your cards show a “not set up yet” page until you publish."
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <Link
            href="/dashboard/profile/preview"
            className="inline-flex h-10 items-center rounded-control px-4 text-sm font-semibold text-bottle underline-offset-4 hover:underline"
          >
            Preview
          </Link>
          <PublishToggle published={profile.isPublished} />
        </div>
      </div>

      <Notice>
        Anything you choose to show is visible to anyone who taps your card, scans its QR code or has the link.
      </Notice>

      <PhotoForm photoSrc={profile.photoKey ? photoUrl(profile.photoKey) : null} initials={initials} />

      <ProfileEditor
        profile={profile}
        profileBaseUrl={env.appUrl.replace(/^https?:\/\//, "")}
      />
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<p className="text-moss">Loading your profile…</p>}>
      <Editor />
    </Suspense>
  );
}
