"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";
import { safeNextPath } from "@/lib/safe-redirect";

export function TwoFactorForm() {
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get("next"));
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").replace(/\s/g, "");
    if (!code) return setError("Enter the code.");
    setPending(true);
    setError(null);
    const { error } = useBackup
      ? await authClient.twoFactor.verifyBackupCode({ code })
      : await authClient.twoFactor.verifyTotp({ code });
    setPending(false);
    if (error) return setError(error.status === 429 ? authErrorMessage(error) : "That code isn't right. Check it and try again.");
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <Field
        label={useBackup ? "Backup code" : "6-digit code from your authenticator app"}
        name="code"
        inputMode={useBackup ? "text" : "numeric"}
        autoComplete="one-time-code"
        required
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Checking…" : "Verify"}
      </Button>
      <Button variant="quiet" className="self-center text-sm" onClick={() => setUseBackup(!useBackup)}>
        {useBackup ? "Use your authenticator app instead" : "Use a backup code instead"}
      </Button>
    </form>
  );
}
