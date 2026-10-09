"use client";

import { useActionState, useId, useTransition } from "react";
import { saveProfileAction } from "@/actions/profile";
import type { ActionState } from "@/actions/result";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, TextArea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";

export type EditorProfile = {
  slug: string;
  displayName: string;
  jobTitle: string | null;
  company: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedinUrl: string | null;
  showJobTitle: boolean;
  showCompany: boolean;
  showBio: boolean;
  showPhoto: boolean;
  showEmail: boolean;
  showPhone: boolean;
  showWebsite: boolean;
  showLinkedin: boolean;
  allowIndexing: boolean;
};

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} className="grid gap-6 border-t border-stone pt-8 md:grid-cols-[14rem_1fr]">
      <div>
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
        {description ? <p className="mt-1 text-sm leading-relaxed text-moss">{description}</p> : null}
      </div>
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}

/** An optional field with its "show publicly" switch beside it. */
function WithVisibility({ name, checked, children }: { name: string; checked: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      {children}
      <Checkbox name={name} defaultChecked={checked} label="Show on my public profile" />
    </div>
  );
}

export function ProfileEditor({ profile, profileBaseUrl }: { profile: EditorProfile; profileBaseUrl: string }) {
  const [state, dispatch] = useActionState<ActionState, FormData>(saveProfileAction, {});
  const [pending, startTransition] = useTransition();
  const err = (field: string) => state.fieldErrors?.[field];

  return (
    <form
      noValidate
      className="flex flex-col gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        // Dispatching inside a transition (rather than via the form `action` prop) keeps what the user typed if validation fails.
        const data = new FormData(event.currentTarget);
        startTransition(() => dispatch(data));
      }}
    >
      {/* Re-mount the fields after a save so they show what was stored (e.g. a normalised LinkedIn URL). */}
      <div key={state.savedAt ?? 0} className="flex flex-col gap-8">
      <Section title="About you" description="Your name is always shown. Choose which other details appear.">
        <Field label="Name" name="displayName" defaultValue={profile.displayName} autoComplete="name" required maxLength={80} error={err("displayName")} />
        <WithVisibility name="showJobTitle" checked={profile.showJobTitle}>
          <Field label="Job title" name="jobTitle" defaultValue={profile.jobTitle ?? ""} autoComplete="organization-title" maxLength={100} error={err("jobTitle")} />
        </WithVisibility>
        <WithVisibility name="showCompany" checked={profile.showCompany}>
          <Field label="Company" name="company" defaultValue={profile.company ?? ""} autoComplete="organization" maxLength={100} error={err("company")} />
        </WithVisibility>
        <WithVisibility name="showBio" checked={profile.showBio}>
          <TextArea label="Short bio" name="bio" defaultValue={profile.bio ?? ""} maxLength={500} hint="Up to 500 characters." error={err("bio")} />
        </WithVisibility>
        <Checkbox name="showPhoto" defaultChecked={profile.showPhoto} label="Show my photo on my public profile" />
      </Section>

      <Section title="Contact details" description="Optional. Email and phone are hidden unless you choose to show them.">
        <WithVisibility name="showLinkedin" checked={profile.showLinkedin}>
          <Field
            label="LinkedIn profile address"
            name="linkedinUrl"
            type="url"
            inputMode="url"
            defaultValue={profile.linkedinUrl ?? ""}
            placeholder="https://www.linkedin.com/in/your-name"
            hint="Copy it from your LinkedIn profile. We never ask for your LinkedIn password."
            error={err("linkedinUrl")}
          />
        </WithVisibility>
        <WithVisibility name="showEmail" checked={profile.showEmail}>
          <Field label="Work email" name="email" type="email" defaultValue={profile.email ?? ""} autoComplete="email" error={err("email")} />
        </WithVisibility>
        <WithVisibility name="showPhone" checked={profile.showPhone}>
          <Field label="Business phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} autoComplete="tel" hint="Use a work number rather than a personal one." error={err("phone")} />
        </WithVisibility>
        <WithVisibility name="showWebsite" checked={profile.showWebsite}>
          <Field label="Website" name="website" type="url" inputMode="url" defaultValue={profile.website ?? ""} placeholder="company.com" error={err("website")} />
        </WithVisibility>
      </Section>

      <Section title="Profile address" description="Your cards keep working if you change this. Old links to your profile page will stop working.">
        <Field
          label="Address"
          name="slug"
          defaultValue={profile.slug}
          autoCapitalize="none"
          spellCheck={false}
          maxLength={40}
          hint={`${profileBaseUrl}/p/your-address`}
          error={err("slug")}
        />
        <Checkbox
          name="allowIndexing"
          defaultChecked={profile.allowIndexing}
          label="Let search engines list my profile"
          hint="Off by default. When off, we ask search engines not to show your profile in results."
        />
      </Section>

      </div>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-3 border-t border-stone bg-paper/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="min-h-6 sm:flex-1" aria-live="polite">
          {state.message ? (
            <span className={state.ok ? "text-sm font-medium text-bottle" : "text-sm font-medium text-danger"}>{state.message}</span>
          ) : null}
        </div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
      {state.ok === false && !state.fieldErrors ? <Notice tone="error">{state.message}</Notice> : null}
    </form>
  );
}
