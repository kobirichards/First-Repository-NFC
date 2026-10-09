import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MfaSetup } from "@/components/admin/mfa-setup";
import { requireAdminPendingMfa } from "@/server/admin";

export const metadata: Metadata = { title: "Set up two-step verification", robots: { index: false } };

async function Setup() {
  const user = await requireAdminPendingMfa();
  if (user.twoFactorEnabled) redirect("/admin");
  return <MfaSetup />;
}

export default function SetupMfaPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold tracking-tight">Set up two-step verification</h1>
      <p className="mt-2 leading-relaxed text-moss">
        Admin accounts can see customers&apos; orders and change their cards, so they need a code from an authenticator app as well as a
        password. You&apos;ll need it every time you sign in.
      </p>
      <div className="mt-8 rounded-card border border-stone bg-sheet p-6">
        <Suspense fallback={<p className="text-moss">Loading…</p>}>
          <Setup />
        </Suspense>
      </div>
    </div>
  );
}
