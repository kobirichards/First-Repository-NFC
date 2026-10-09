"use client";

import { useActionState } from "react";
import type { ActionState } from "@/actions/result";
import { checkoutAction } from "@/actions/shop";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";

export function CheckoutButton({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState<ActionState>(checkoutAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.message ? <Notice tone="error">{state.message}</Notice> : null}
      <Button type="submit" size="lg" disabled={disabled || pending} className="w-full">
        {pending ? "Going to secure checkout…" : "Check out securely"}
      </Button>
    </form>
  );
}
