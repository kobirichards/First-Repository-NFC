import type { Metadata } from "next";
import { Suspense } from "react";
import { DataPanel, DeleteAccountForm, EmailForm, NameForm, PasswordForm } from "@/components/dashboard/account-forms";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import { requireUser } from "@/server/session";
import { Loading } from "@/components/ui/loading";

export const metadata: Metadata = { title: "Account settings", robots: { index: false } };

async function Account() {
  const user = await requireUser("/dashboard/account");
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Account settings</h1>
        <SignOutButton />
      </div>
      <NameForm name={user.name} />
      <EmailForm email={user.email} />
      <PasswordForm />
      <DataPanel />
      <DeleteAccountForm />
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Account />
    </Suspense>
  );
}
