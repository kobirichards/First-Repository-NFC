"use client";

import { useState, useTransition } from "react";
import { setPublishedAction } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { callAction } from "@/lib/call-action";

export function PublishToggle({ published }: { published: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button
        variant={published ? "secondary" : "primary"}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await callAction(() => setPublishedAction(!published));
            setError(result.ok ? null : (result.message ?? null));
          })
        }
      >
        {pending ? "Saving…" : published ? "Take profile offline" : "Publish profile"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
