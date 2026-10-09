"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

export function CheckEmail() {
  const email = useSearchParams().get("email");
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function resend() {
    if (!email) return;
    setPending(true);
    const { error } = await authClient.sendVerificationEmail({ email, callbackURL: "/verified" });
    setPending(false);
    setStatus(error ? { tone: "error", text: authErrorMessage(error) } : { tone: "success", text: "Sent. Check your inbox again." });
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="leading-relaxed">
        We&apos;ve sent a confirmation link to {email ? <strong className="font-semibold">{email}</strong> : "your email address"}. Open
        it to finish creating your account. The link expires in 1 hour.
      </p>
      <p className="text-sm leading-relaxed text-moss">Can&apos;t find it? Check your spam folder, or send it again.</p>
      {status ? <Notice tone={status.tone}>{status.text}</Notice> : null}
      {email ? (
        <Button variant="secondary" onClick={resend} disabled={pending}>
          {pending ? "Sending…" : "Send the link again"}
        </Button>
      ) : null}
    </div>
  );
}
