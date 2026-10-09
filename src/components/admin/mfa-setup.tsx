"use client";

import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { authClient } from "@/lib/auth-client";

type Step = { kind: "password" } | { kind: "scan"; qr: string; secret: string; backupCodes: string[] };

export function MfaSetup() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "password" });
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  if (step.kind === "password") {
    return (
      <form
        className="flex flex-col gap-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError(null);
          const password = String(new FormData(e.currentTarget).get("password") ?? "");
          const { data, error } = await authClient.twoFactor.enable({ password });
          setPending(false);
          if (error || !data) return setError(error?.status === 429 ? "Too many attempts. Wait a minute." : "That password isn't right.");
          if (data.method !== "totp") return setError("Authenticator-app setup isn't available. Check the two-factor configuration.");
          const secret = new URL(data.totpURI).searchParams.get("secret") ?? "";
          setStep({ kind: "scan", qr: await QRCode.toDataURL(data.totpURI, { margin: 1, width: 220 }), secret, backupCodes: data.backupCodes });
        }}
      >
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Field label="Your password" name="password" type="password" autoComplete="current-password" required />
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Checking…" : "Continue"}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="font-semibold">1. Scan this with your authenticator app</h2>
        <p className="mt-1 text-sm text-moss">For example 1Password, Google Authenticator or Microsoft Authenticator.</p>
        {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
        <img src={step.qr} alt="QR code for your authenticator app" width={220} height={220} className="mt-4 rounded-control border border-stone" />
        <p className="mt-3 text-sm">
          Can&apos;t scan? Enter this key: <code className="rounded bg-stone px-1.5 py-0.5 font-mono text-xs break-all" data-testid="totp-secret">{step.secret}</code>
        </p>
      </section>
      <section>
        <h2 className="font-semibold">2. Save your backup codes</h2>
        <p className="mt-1 text-sm text-moss">Each code works once if you lose your phone. Store them somewhere safe, like a password manager.</p>
        <ul className="mt-3 grid max-w-sm grid-cols-2 gap-2 font-mono text-sm">
          {step.backupCodes.map((c) => (
            <li key={c} className="rounded bg-sheet px-2 py-1 ring-1 ring-stone">
              {c}
            </li>
          ))}
        </ul>
        <label className="mt-4 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.currentTarget.checked)} className="accent-bottle" />
          I&apos;ve saved my backup codes
        </label>
      </section>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError(null);
          const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
          const { error } = await authClient.twoFactor.verifyTotp({ code });
          setPending(false);
          if (error) return setError("That code isn't right. Codes change every 30 seconds; try the current one.");
          router.push("/admin");
          router.refresh();
        }}
      >
        <h2 className="font-semibold">3. Enter the 6-digit code from the app</h2>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Field label="Code" name="code" inputMode="numeric" autoComplete="one-time-code" required className="max-w-48" />
        <Button type="submit" disabled={pending || !saved} className="self-start">
          {pending ? "Checking…" : "Turn on two-step verification"}
        </Button>
      </form>
    </div>
  );
}
