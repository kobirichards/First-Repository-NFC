import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPanel } from "@/components/auth/auth-panel";
import { CheckEmail } from "@/components/auth/check-email";

export const metadata: Metadata = { title: "Check your email", robots: { index: false } };

export default function CheckEmailPage() {
  return (
    <AuthPanel title="Check your email">
      <Suspense>
        <CheckEmail />
      </Suspense>
    </AuthPanel>
  );
}
