"use client";

import { type ReactNode, useActionState } from "react";
import type { ActionState } from "@/actions/result";
import { Button } from "@/components/ui/button";

/** A small admin form bound to a server action, showing its result inline. */
export function ActionForm({
  action,
  submitLabel,
  children,
  className,
  variant = "primary",
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  children?: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={className ?? "flex flex-col gap-3"} noValidate>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant={variant} disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {state.message ? (
          <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm font-medium text-bottle" : "text-sm font-medium text-danger"}>
            {state.fieldErrors ? Object.values(state.fieldErrors)[0] : state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export const inputClass = "h-10 rounded-control border border-ink/20 bg-sheet px-3 text-sm";
