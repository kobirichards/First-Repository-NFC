"use client";

import { useActionState } from "react";
import { claimCardAction } from "@/actions/claim";
import type { ActionState } from "@/actions/result";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";

export function ClaimForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(claimCardAction.bind(null, token), {});
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      {state.message && !state.fieldErrors?.code ? <Notice tone="error">{state.message}</Notice> : null}
      <Field
        label="Claim code"
        name="code"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required
        maxLength={20}
        placeholder="ABCDE-23456"
        hint="Printed inside your card's packaging."
        error={state.fieldErrors?.code}
      />
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Activating…" : "Activate card"}
      </Button>
    </form>
  );
}
