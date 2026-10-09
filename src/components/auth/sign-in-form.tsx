"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { safeNextPath } from "@/lib/safe-redirect";

type Mode = "password" | "link";

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [mode, setMode] = useState<Mode>("password");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(params.get("reset") === "1" ? "Password changed. Sign in with your new password." : null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    if (!email) return setError("Enter your email address.");
    setPending(true);
    setError(null);
    setInfo(null);

    if (mode === "link") {
      const { error } = await authClient.signIn.magicLink({ email, callbackURL: next });
      setPending(false);
      // Same message whether or not the account exists, so this form can't be used to probe for accounts.
      if (error && error.status === 429) return setError(authErrorMessage(error));
      return setInfo(`If ${email} has an account, a sign-in link is on its way. It expires in 10 minutes.`);
    }

    const password = String(form.get("password") ?? "");
    const { data, error } = await authClient.signIn.email({ email, password });
    setPending(false);
    if (error?.code === "EMAIL_NOT_VERIFIED") {
      // Only reached with the right password, so re-sending doesn't leak whether the account exists.
      await authClient.sendVerificationEmail({ email, callbackURL: `/verified?next=${encodeURIComponent(next)}` });
    }
    if (error) return setError(authErrorMessage(error));
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      return router.push(`/two-factor?next=${encodeURIComponent(next)}`);
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {error ? <Notice tone="error">{error}</Notice> : null}
      {info ? <Notice tone="success">{info}</Notice> : null}
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      {mode === "password" ? (
        <div className="flex flex-col gap-2">
          <Field label="Password" name="password" type="password" autoComplete="current-password" required />
          <Link href="/forgot-password" className="self-start text-sm font-semibold text-bottle underline-offset-4 hover:underline">
            Forgot your password?
          </Link>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-moss">We&apos;ll email you a link that signs you in. No password needed.</p>
      )}
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Signing in…" : mode === "password" ? "Sign in" : "Email me a sign-in link"}
      </Button>
      <Button
        variant="quiet"
        className="self-center text-sm"
        onClick={() => {
          setMode(mode === "password" ? "link" : "password");
          setError(null);
          setInfo(null);
        }}
      >
        {mode === "password" ? "Sign in with an email link instead" : "Sign in with a password instead"}
      </Button>
    </form>
  );
}
