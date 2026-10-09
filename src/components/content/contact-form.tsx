"use client";

import { useActionState, useTransition } from "react";
import { submitContactAction } from "@/actions/enquiry";
import type { ActionState } from "@/actions/result";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";

export function ContactForm() {
  const [state, dispatch] = useActionState<ActionState, FormData>(submitContactAction, {});
  const [pending, start] = useTransition();
  const err = (f: string) => state.fieldErrors?.[f];
  if (state.ok) return <Notice tone="success" title="Message sent">{state.message}</Notice>;
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(() => dispatch(data));
      }}
    >
      {state.message && !state.fieldErrors ? <Notice tone="error">{state.message}</Notice> : null}
      <Field label="Your name" name="name" autoComplete="name" required error={err("name")} />
      <Field label="Email" name="email" type="email" autoComplete="email" required error={err("email")} />
      <Field label="Order reference (if it's about an order)" name="orderReference" placeholder="TS-ABC123" error={err("orderReference")} />
      <TextArea label="Message" name="message" required maxLength={2000} error={err("message")} />
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Leave this empty</label>
        <input id="contact-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" size="lg" className="self-start" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
