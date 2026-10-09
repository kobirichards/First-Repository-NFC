import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { ButtonLink } from "@/components/ui/button";
import { analyticsEnabled, viewTotal } from "@/server/analytics";
import { countOwnCards } from "@/server/cards";
import { getOwnProfile } from "@/server/profiles";
import { requireUser } from "@/server/session";
import { Loading } from "@/components/ui/loading";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

async function Overview() {
  const user = await requireUser("/dashboard");
  const [profile, cardCounts] = await Promise.all([getOwnProfile(user.id), countOwnCards(user.id)]);
  const firstName = user.name.split(" ")[0];
  const { total: cardTotal, active } = cardCounts;
  const views = analyticsEnabled() && profile ? await viewTotal(profile.id) : null;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hello, {firstName}</h1>
          <p className="mt-2 text-moss">
            Signed in as <span className="font-medium text-ink">{user.email}</span>
          </p>
        </div>
        <SignOutButton />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section aria-labelledby="profile-heading" className="flex flex-col rounded-card border border-stone bg-sheet p-6">
          <h2 id="profile-heading" className="text-lg font-semibold">
            Profile
          </h2>
          <p className="mt-2 flex-1 leading-relaxed text-moss">
            {!profile
              ? "Set up the page your cards open: your role, company, LinkedIn and how to reach you."
              : profile.isPublished
                ? `Your profile is live.${views !== null ? ` ${views} ${views === 1 ? "view" : "views"} in the last 30 days.` : ""}`
                : "Your profile is a draft. Publish it so your cards have somewhere to go."}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <ButtonLink href="/dashboard/profile">{profile ? "Edit profile" : "Set up profile"}</ButtonLink>
            {profile?.isPublished ? (
              <Link href={`/p/${profile.slug}`} className="text-sm font-semibold text-bottle underline-offset-4 hover:underline">
                View live profile
              </Link>
            ) : null}
          </div>
        </section>

        <section aria-labelledby="cards-heading" className="flex flex-col rounded-card border border-stone bg-sheet p-6">
          <h2 id="cards-heading" className="text-lg font-semibold">
            Cards
          </h2>
          <p className="mt-2 flex-1 leading-relaxed text-moss">
            {cardTotal === 0
              ? "No cards yet. To add a new card, tap it with your phone or scan its QR code."
              : `${cardTotal} ${cardTotal === 1 ? "card" : "cards"}, ${active} active.`}
          </p>
          <div className="mt-5">
            <ButtonLink href={cardTotal ? "/dashboard/cards" : "/shop"} variant={cardTotal ? "primary" : "secondary"}>
              {cardTotal ? "Manage cards" : "Order cards"}
            </ButtonLink>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Loading label="Loading your account" />}>
      <Overview />
    </Suspense>
  );
}
