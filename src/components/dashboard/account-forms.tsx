"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, buttonClass } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

type Status = { tone: "success" | "error"; text: string } | null;

function Panel({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-stone pt-8 md:grid-cols-[14rem_1fr]">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {description ? <div className="mt-1 text-sm leading-relaxed text-moss">{description}</div> : null}
      </div>
      <div className="flex max-w-lg flex-col gap-5">{children}</div>
    </section>
  );
}

export function NameForm({ name }: { name: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);
  return (
    <Panel title="Account name" description="Used in emails from us. Your public name is set on your profile.">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const value = String(new FormData(e.currentTarget).get("name") ?? "").trim();
          if (!value) return setStatus({ tone: "error", text: "Enter your name." });
          setPending(true);
          const { error } = await authClient.updateUser({ name: value.slice(0, 100) });
          setPending(false);
          setStatus(error ? { tone: "error", text: authErrorMessage(error) } : { tone: "success", text: "Name saved." });
          router.refresh();
        }}
      >
        <Field label="Name" name="name" defaultValue={name} autoComplete="name" maxLength={100} />
        {status ? <Notice tone={status.tone}>{status.text}</Notice> : null}
        <Button type="submit" variant="secondary" className="self-start" disabled={pending}>
          {pending ? "Saving…" : "Save name"}
        </Button>
      </form>
    </Panel>
  );
}

export function EmailForm({ email }: { email: string }) {
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);
  return (
    <Panel title="Email address" description={<>You sign in with <strong className="font-semibold text-ink">{email}</strong>.</>}>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const newEmail = String(new FormData(e.currentTarget).get("newEmail") ?? "").trim().toLowerCase();
          if (!newEmail) return setStatus({ tone: "error", text: "Enter the new email address." });
          setPending(true);
          const { error } = await authClient.changeEmail({ newEmail, callbackURL: "/dashboard/account" });
          setPending(false);
          setStatus(
            error
              ? { tone: "error", text: authErrorMessage(error) }
              : { tone: "success", text: `Check ${email} to approve the change. Then we'll ask you to confirm ${newEmail}.` },
          );
        }}
      >
        <Field label="New email address" name="newEmail" type="email" autoComplete="email" />
        {status ? <Notice tone={status.tone}>{status.text}</Notice> : null}
        <Button type="submit" variant="secondary" className="self-start" disabled={pending}>
          {pending ? "Sending…" : "Change email"}
        </Button>
      </form>
    </Panel>
  );
}

export function PasswordForm() {
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);
  return (
    <Panel title="Password" description="Changing it signs you out everywhere else.">
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const data = new FormData(form);
          const currentPassword = String(data.get("currentPassword") ?? "");
          const newPassword = String(data.get("newPassword") ?? "");
          if (newPassword.length < 10) return setStatus({ tone: "error", text: "Use at least 10 characters for your new password." });
          setPending(true);
          const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
          setPending(false);
          if (error) {
            return setStatus({
              tone: "error",
              text: error.code === "INVALID_PASSWORD" ? "Your current password isn't right." : authErrorMessage(error),
            });
          }
          form.reset();
          setStatus({ tone: "success", text: "Password changed." });
        }}
      >
        <Field label="Current password" name="currentPassword" type="password" autoComplete="current-password" />
        <Field label="New password" name="newPassword" type="password" autoComplete="new-password" hint="At least 10 characters." />
        {status ? <Notice tone={status.tone}>{status.text}</Notice> : null}
        <Button type="submit" variant="secondary" className="self-start" disabled={pending}>
          {pending ? "Saving…" : "Change password"}
        </Button>
      </form>
    </Panel>
  );
}

export function DataPanel() {
  return (
    <Panel title="Your data" description="A JSON file of your account, profile, cards, orders and active sign-ins.">
      <a href="/api/account/export" className={buttonClass("secondary", "md", "self-start")}>
        Download my data
      </a>
    </Panel>
  );
}

export function DeleteAccountForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState(false);
  return (
    <Panel
      title="Delete account"
      description="This can't be undone."
    >
      <div className="flex flex-col gap-2 text-sm leading-relaxed">
        <p>Deleting your account:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>removes your profile and photo straight away</li>
          <li>deactivates all your cards, so tapping them shows a &ldquo;not active&rdquo; page</li>
          <li>keeps order records we&apos;re required to hold for accounting, without linking them to you</li>
        </ul>
      </div>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          if (data.get("confirm") !== "DELETE") return setStatus({ tone: "error", text: "Type DELETE to confirm." });
          setPending(true);
          const { error } = await authClient.deleteUser({ password: String(data.get("password") ?? "") });
          setPending(false);
          if (error) {
            return setStatus({
              tone: "error",
              text: error.code === "INVALID_PASSWORD" ? "Your password isn't right." : authErrorMessage(error),
            });
          }
          router.push("/?deleted=1");
          router.refresh();
        }}
      >
        <Field label="Password" name="password" type="password" autoComplete="current-password" />
        <Field label="Type DELETE to confirm" name="confirm" autoComplete="off" autoCapitalize="characters" />
        {status ? <Notice tone={status.tone}>{status.text}</Notice> : null}
        <Button type="submit" variant="danger" className="self-start" disabled={pending}>
          {pending ? "Deleting…" : "Delete my account"}
        </Button>
      </form>
    </Panel>
  );
}
