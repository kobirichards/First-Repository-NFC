import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPanel } from "@/components/auth/auth-panel";
import { ClaimForm } from "@/components/auth/claim-form";
import { ButtonLink } from "@/components/ui/button";
import { getClaimState } from "@/server/cards";
import { getSessionUser } from "@/server/session";
import { Loading } from "@/components/ui/loading";

export const metadata: Metadata = { title: "Activate your card", robots: { index: false } };

async function Activate({ params }: { params: PageProps<"/activate/[token]">["params"] }) {
  const { token } = await params;
  const user = await getSessionUser();
  const state = await getClaimState(token, user?.id ?? null);
  const here = `/activate/${encodeURIComponent(token)}`;

  if (state?.ownedByViewer) {
    return (
      <AuthPanel title="This card is already yours">
        <p className="leading-relaxed">It&apos;s linked to your account.</p>
        <ButtonLink href="/dashboard/cards" size="lg" className="mt-6 w-full">
          Manage your cards
        </ButtonLink>
      </AuthPanel>
    );
  }

  // Claimed by someone else, deactivated or unknown: say the same thing for all three.
  if (!state || state.status !== "UNCLAIMED") {
    return (
      <AuthPanel title="This card can't be activated">
        <p className="leading-relaxed">
          It may already be linked to an account. If you bought this card and think something&apos;s wrong, contact us and quote the
          card&apos;s order reference.
        </p>
        <ButtonLink href="/contact" variant="secondary" size="lg" className="mt-6 w-full">
          Contact us
        </ButtonLink>
      </AuthPanel>
    );
  }

  if (!user) {
    return (
      <AuthPanel
        title="Activate your card"
        intro="This card is new and isn't linked to anyone yet. Sign in or create an account, then enter the claim code from the packaging."
      >
        <div className="flex flex-col gap-3">
          <ButtonLink href={`/sign-up?next=${encodeURIComponent(here)}`} size="lg">
            Create an account
          </ButtonLink>
          <ButtonLink href={`/sign-in?next=${encodeURIComponent(here)}`} variant="secondary" size="lg">
            Sign in
          </ButtonLink>
        </div>
      </AuthPanel>
    );
  }

  return (
    <AuthPanel
      title="Activate your card"
      intro={
        <>
          Enter the claim code to link this card to <strong className="font-semibold text-ink">{user.email}</strong>.
        </>
      }
    >
      <ClaimForm token={token} />
    </AuthPanel>
  );
}

export default function ActivatePage(props: PageProps<"/activate/[token]">) {
  return (
    <Suspense fallback={<Loading label="Checking this card" />}>
      <Activate params={props.params} />
    </Suspense>
  );
}
