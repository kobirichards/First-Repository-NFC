import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthPanel } from "@/components/auth/auth-panel";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function SignUpPage() {
  return (
    <AuthPanel
      title="Create an account"
      intro="You'll use this account to set up your profile and manage your cards."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-bottle underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense>
        <SignUpForm />
      </Suspense>
    </AuthPanel>
  );
}
