import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfileView } from "@/components/profile/profile-view";
import { ShareButton } from "@/components/profile/share-button";
import { photoUrl, profileUrl } from "@/server/links";
import { getPublicProfileBySlug } from "@/server/profiles";
import { qrSvg } from "@/server/qr";

export async function generateMetadata(props: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const profile = await getPublicProfileBySlug(slug);
  if (!profile) return { title: "Profile not found", robots: { index: false, follow: false } };
  const role = [profile.jobTitle, profile.company].filter(Boolean).join(" at ");
  return {
    title: { absolute: profile.displayName },
    description: role || `${profile.displayName}'s digital business card`,
    // Profiles are noindex unless the owner opts in.
    robots: profile.allowIndexing ? { index: true, follow: false } : { index: false, follow: false },
    alternates: { canonical: `/p/${profile.slug}` },
    openGraph: { title: profile.displayName, description: role || undefined, type: "profile" },
  };
}

/**
 * Looked up before anything streams, so unknown or unpublished profiles get a
 * real 404 status (a notFound() inside <Suspense> would arrive after a 200).
 */
export const instant = false;

export default async function PublicProfilePage(props: PageProps<"/p/[slug]">) {
  const { slug } = await props.params;
  const profile = await getPublicProfileBySlug(slug);
  if (!profile) notFound();
  const url = profileUrl(profile.slug);
  const svg = await qrSvg(url);

  return (
    <ProfileView
      profile={profile}
      photoSrc={profile.photoKey ? photoUrl(profile.photoKey) : null}
      vcardHref={`/p/${profile.slug}/vcard`}
      actions={
        <div className="flex flex-col gap-4">
          <ShareButton url={url} title={profile.displayName} />
          <details className="group rounded-card border border-stone bg-sheet">
            <summary className="cursor-pointer list-none px-5 py-4 font-semibold marker:hidden">
              <span className="flex items-center justify-between">
                Show QR code
                <span aria-hidden="true" className="text-moss transition-transform group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <div className="px-5 pb-5">
              <div
                role="img"
                aria-label={`QR code linking to ${profile.displayName}'s profile`}
                className="mx-auto w-full max-w-60 [&>svg]:h-auto [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
              <p className="mt-3 text-center text-sm text-moss">Let someone scan this from your screen.</p>
            </div>
          </details>
        </div>
      }
    />
  );
}
