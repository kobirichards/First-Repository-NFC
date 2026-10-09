import type { Metadata } from "next";
import { Suspense } from "react";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

async function Overview() {
  const user = await requireUser("/dashboard");
  const firstName = user.name.split(" ")[0];
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

      <section aria-labelledby="next-steps" className="rounded-card border border-stone bg-sheet p-6 sm:p-8">
        <h2 id="next-steps" className="text-lg font-semibold">
          Get your card ready
        </h2>
        <p className="measure mt-2 leading-relaxed text-moss">
          You don&apos;t have a profile or any cards yet. Once you&apos;ve ordered a card, you&apos;ll set up the profile it
          opens here.
        </p>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-moss">Loading your account…</p>}>
      <Overview />
    </Suspense>
  );
}
