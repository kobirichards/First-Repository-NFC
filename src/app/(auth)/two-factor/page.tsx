import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthPanel } from "@/components/auth/auth-panel";
import { TwoFactorForm } from "@/components/auth/two-factor-form";

export const metadata: Metadata = { title: "Two-step verification", robots: { index: false } };

export default function TwoFactorPage() {
  return (
    <AuthPanel title="Two-step verification" intro="Your account has two-step verification turned on.">
      <Suspense>
        <TwoFactorForm />
      </Suspense>
    </AuthPanel>
  );
}
