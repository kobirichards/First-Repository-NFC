import type { Metadata } from "next";
import { Suspense } from "react";
import { CardControls } from "@/components/dashboard/card-controls";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { safeExternalUrl } from "@/lib/urls";
import { listOwnCards } from "@/server/cards";
import { cardUrl } from "@/server/links";
import { getOwnProfile } from "@/server/profiles";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Your cards", robots: { index: false } };

async function Cards({ searchParams }: { searchParams: PageProps<"/dashboard/cards">["searchParams"] }) {
  const user = await requireUser("/dashboard/cards");
  const [cards, profile, params] = await Promise.all([listOwnCards(user.id), getOwnProfile(user.id), searchParams]);
  const hasLinkedIn = Boolean(safeExternalUrl(profile?.linkedinUrl));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your cards</h1>
        <p className="mt-2 text-moss">Choose where each card goes, download its QR code, or switch it off if it&apos;s lost.</p>
      </div>

      {params.claimed === "1" ? (
        <Notice tone="success" title="Card activated">
          {profile?.isPublished
            ? "It now opens your profile."
            : "Publish your profile so the card has somewhere to go."}
        </Notice>
      ) : null}

      {cards.length === 0 ? (
        <div className="rounded-card border border-stone bg-sheet p-6 sm:p-8">
          <h2 className="text-lg font-semibold">No cards yet</h2>
          <p className="measure mt-2 leading-relaxed text-moss">
            Got a new card? Tap it with your phone or scan its QR code, and follow the steps to add it here. Cards you order are
            added automatically when they ship.
          </p>
          <ButtonLink href="/shop" className="mt-6">
            Order cards
          </ButtonLink>
        </div>
      ) : (
        <ul className="flex flex-col gap-5">
          {cards.map((card) => (
            <CardControls
              key={card.id}
              hasLinkedIn={hasLinkedIn}
              card={{ id: card.id, label: card.label, status: card.status, destination: card.destination, url: cardUrl(card.token) }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CardsPage(props: PageProps<"/dashboard/cards">) {
  return (
    <Suspense fallback={<p className="text-moss">Loading your cards…</p>}>
      <Cards searchParams={props.searchParams} />
    </Suspense>
  );
}
