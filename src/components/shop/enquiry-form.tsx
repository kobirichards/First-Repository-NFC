"use client";

import { useActionState, useTransition } from "react";
import { submitEnquiryAction } from "@/actions/enquiry";
import type { ActionState } from "@/actions/result";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { TIMELINES } from "@/lib/validation/enquiry";

export function EnquiryForm() {
  const [state, dispatch] = useActionState<ActionState, FormData>(submitEnquiryAction, {});
  const [pending, startTransition] = useTransition();
  const err = (f: string) => state.fieldErrors?.[f];

  if (state.ok) return <Notice tone="success" title="Enquiry sent">{state.message}</Notice>;

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => dispatch(data));
      }}
    >
      {state.message && !state.ok && !state.fieldErrors ? <Notice tone="error">{state.message}</Notice> : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Company" name="company" autoComplete="organization" required error={err("company")} />
        <Field label="Your name" name="name" autoComplete="name" required error={err("name")} />
        <Field label="Work email" name="email" type="email" autoComplete="email" required error={err("email")} />
        <Field label="Phone (optional)" name="phone" type="tel" autoComplete="tel" error={err("phone")} />
        <Field label="Roughly how many cards?" name="quantity" type="number" inputMode="numeric" min={1} required error={err("quantity")} />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="timeline" className="text-sm font-semibold">
            When do you need them?
          </label>
          <select
            id="timeline"
            name="timeline"
            defaultValue=""
            aria-invalid={err("timeline") ? true : undefined}
            aria-describedby={err("timeline") ? "timeline-error" : undefined}
            className="h-11 rounded-control border border-ink/20 bg-sheet px-3"
          >
            <option value="" disabled>
              Choose…
            </option>
            {TIMELINES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          {err("timeline") ? (
            <p id="timeline-error" className="text-sm font-medium text-danger">
              {err("timeline")}
            </p>
          ) : null}
        </div>
      </div>
      <TextArea label="What do you need?" name="message" required maxLength={2000} hint="For example: an upcoming event, branding, or how many people." error={err("message")} />
      {/* Honeypot, hidden from people and assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Leave this empty</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" size="lg" className="self-start" disabled={pending}>
        {pending ? "Sending…" : "Send enquiry"}
      </Button>
      <p className="text-sm text-moss">We use these details only to reply to your enquiry.</p>
    </form>
  );
}
