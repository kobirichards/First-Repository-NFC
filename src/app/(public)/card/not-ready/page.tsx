import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "This card isn't set up yet", robots: { index: false } };

export default function NotReadyCardPage() {
  return (
    <div className="mx-auto max-w-md px-4 pt-20">
      <h1 className="text-2xl font-bold tracking-tight">This card isn&apos;t set up yet</h1>
      <p className="mt-3 leading-relaxed text-moss">
        Its owner hasn&apos;t published their profile yet. Try again later. If it&apos;s your card, sign in and publish your profile.
      </p>
      <div className="mt-8">
        <ButtonLink href="/sign-in?next=%2Fdashboard%2Fprofile">Sign in</ButtonLink>
      </div>
    </div>
  );
}
