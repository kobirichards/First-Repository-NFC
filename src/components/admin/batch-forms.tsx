"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createBatchAction, regenerateCodesAction } from "@/actions/admin";
import type { ActionState } from "@/actions/result";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { inputClass } from "./forms";

function download(csv: string, filename: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

type Result = ActionState & { csv?: string; filename?: string };

export function CreateBatchForm() {
  const [state, action, pending] = useActionState<Result, FormData>(createBatchAction, {});
  const downloaded = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (state.csv && state.filename && downloaded.current !== state.filename) {
      downloaded.current = state.filename;
      download(state.csv, state.filename);
    }
  }, [state]);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Batch name
          <input name="label" required maxLength={80} placeholder="e.g. October print run" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Number of cards
          <input name="quantity" type="number" min={1} max={1000} defaultValue={50} className={`${inputClass} w-32`} />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create batch and download CSV"}
        </Button>
      </div>
      <p className="text-sm text-moss">
        The CSV is the only copy of the claim codes. Send it to the printer, then delete it. If it&apos;s lost before printing, use
        &ldquo;New claim codes&rdquo; on the batch.
      </p>
      {state.message ? (
        <Notice tone={state.ok ? "success" : "error"}>
          {state.fieldErrors ? Object.values(state.fieldErrors)[0] : state.message}
          {state.ok && state.csv ? (
            <Button variant="quiet" className="ml-2 text-sm" onClick={() => download(state.csv!, state.filename!)}>
              Download it again
            </Button>
          ) : null}
        </Notice>
      ) : null}
    </form>
  );
}

export function RegenerateCodesButton({ batchId }: { batchId: string }) {
  const [pending, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  if (!confirming) {
    return (
      <Button variant="quiet" className="text-sm" onClick={() => setConfirming(true)}>
        New claim codes
      </Button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      Codes already printed will stop working.
      <Button
        variant="danger"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await regenerateCodesAction(batchId);
            if (r.csv && r.filename) download(r.csv, r.filename);
            setMessage(r.message ?? null);
            setConfirming(false);
          })
        }
      >
        Replace codes
      </Button>
      {message ? <span role="status">{message}</span> : null}
    </span>
  );
}
