import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/button";
import type { PublicProfile } from "@/server/profiles";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-3.5">
      <dt className="text-sm text-moss">{label}</dt>
      <dd className="font-medium break-words">{children}</dd>
    </div>
  );
}

const ext = { target: "_blank", rel: "noopener noreferrer" } as const;

/**
 * The public profile as visitors see it. Used by the real page and the
 * dashboard preview, so the preview is exactly what visitors get.
 * Only accepts PublicProfile, which already has hidden fields removed.
 */
export function ProfileView({
  profile,
  photoSrc,
  vcardHref,
  actions,
}: {
  profile: PublicProfile;
  photoSrc: string | null;
  vcardHref: string | null;
  actions?: ReactNode;
}) {
  const roleLine = [profile.jobTitle, profile.company].filter(Boolean).join(" at ");
  const initials = profile.displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <article className="mx-auto w-full max-w-md px-5 pt-10">
      <header className="flex flex-col items-start">
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- served by our own media route with access rules
          <img src={photoSrc} alt="" width={96} height={96} className="size-24 rounded-full object-cover ring-4 ring-sheet" />
        ) : (
          <div aria-hidden="true" className="flex size-24 items-center justify-center rounded-full bg-bottle text-2xl font-bold text-white">
            {initials}
          </div>
        )}
        <h1 className="mt-5 text-3xl leading-tight font-bold tracking-tight text-balance">{profile.displayName}</h1>
        {roleLine ? <p className="mt-1.5 text-lg text-moss">{roleLine}</p> : null}
      </header>

      <div className="mt-8 flex flex-col gap-3">
        {profile.linkedinUrl ? (
          <a href={profile.linkedinUrl} {...ext} className={buttonClass("primary", "lg")}>
            Connect on LinkedIn
          </a>
        ) : null}
        {vcardHref ? (
          <a href={vcardHref} className={buttonClass(profile.linkedinUrl ? "secondary" : "primary", "lg")}>
            Save contact
          </a>
        ) : null}
      </div>

      {profile.bio ? <p className="mt-8 leading-relaxed whitespace-pre-line">{profile.bio}</p> : null}

      {profile.email || profile.phone || profile.website ? (
        <dl className="mt-8 divide-y divide-stone border-y border-stone">
          {profile.email ? (
            <Row label="Email">
              <a href={`mailto:${profile.email}`} className="text-bottle underline-offset-4 hover:underline">
                {profile.email}
              </a>
            </Row>
          ) : null}
          {profile.phone ? (
            <Row label="Phone">
              <a href={`tel:${profile.phone.replace(/[^\d+]/g, "")}`} className="text-bottle underline-offset-4 hover:underline">
                {profile.phone}
              </a>
            </Row>
          ) : null}
          {profile.website ? (
            <Row label="Website">
              <a href={profile.website} {...ext} className="text-bottle underline-offset-4 hover:underline">
                {profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            </Row>
          ) : null}
        </dl>
      ) : null}

      {actions ? <div className="mt-8">{actions}</div> : null}
    </article>
  );
}
