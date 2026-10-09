import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "This card isn't active", robots: { index: false } };

export default function InactiveCardPage() {
  return (
    <div className="mx-auto max-w-md px-4 pt-20">
      <h1 className="text-2xl font-bold tracking-tight">This card isn&apos;t active</h1>
      <p className="mt-3 leading-relaxed text-moss">
        The card you tapped has been switched off by its owner, or isn&apos;t linked to a profile. If it&apos;s your card, sign in
        to reactivate it.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/sign-in?next=%2Fdashboard%2Fcards">Sign in</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          What is this?
        </ButtonLink>
      </div>
    </div>
  );
}
