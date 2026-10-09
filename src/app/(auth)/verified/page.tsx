import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthPanel } from "@/components/auth/auth-panel";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { safeNextPath } from "@/lib/safe-redirect";
import { getSessionUser } from "@/server/session";
import { Loading } from "@/components/ui/loading";

export const metadata: Metadata = { title: "Email confirmed", robots: { index: false } };

async function VerifiedResult({ searchParams }: { searchParams: PageProps<"/verified">["searchParams"] }) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null);
  if (params.error) {
    return (
      <Notice tone="error" title="This confirmation link doesn't work">
        It may have expired or already been used. <Link href="/sign-in" className="font-semibold underline">Sign in</Link> and
        we&apos;ll send you a new one.
      </Notice>
    );
  }
  const user = await getSessionUser();
  return (
    <div className="flex flex-col gap-5">
      <Notice tone="success" title="Email confirmed">
        Your account is ready.
      </Notice>
      <ButtonLink href={user ? next : "/sign-in"} size="lg">
        {user ? "Continue to your account" : "Sign in"}
      </ButtonLink>
    </div>
  );
}

export default function VerifiedPage(props: PageProps<"/verified">) {
  return (
    <AuthPanel title="Confirm your email">
      <Suspense fallback={<Loading label="Checking your link" />}>
        <VerifiedResult searchParams={props.searchParams} />
      </Suspense>
    </AuthPanel>
  );
}
