"use client";

import { useState, useTransition } from "react";
import { reassignCardAction, releaseCardAction, setCardActiveAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { ActionForm, inputClass } from "./forms";
import { callAction } from "@/lib/call-action";

export function CardAdminActions({ cardId, status, hasOwner }: { cardId: string; status: string; hasOwner: boolean }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok?: boolean; text?: string; code?: string } | null>(null);
  const [confirmRelease, setConfirmRelease] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        {status === "ACTIVE" ? (
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await callAction(() => setCardActiveAction(cardId, false));
                setMessage({ ok: r.ok, text: r.ok === false ? r.message : "Card disabled." });
              })
            }
          >
            Disable card
          </Button>
        ) : null}
        {status === "DEACTIVATED" && hasOwner ? (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await callAction(() => setCardActiveAction(cardId, true));
                setMessage({ ok: r.ok, text: r.ok === false ? r.message : "Card reactivated." });
              })
            }
          >
            Reactivate card
          </Button>
        ) : null}
        {hasOwner ? (
          confirmRelease ? (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              Detach from the owner and return to stock with a new claim code?
              <Button
                variant="danger"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await callAction(() => releaseCardAction(cardId));
                    setMessage({ ok: r.ok, text: r.message, code: "claimCode" in r ? r.claimCode : undefined });
                    setConfirmRelease(false);
                  })
                }
              >
                Return to stock
              </Button>
            </span>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmRelease(true)}>
              Return to stock
            </Button>
          )
        ) : null}
      </div>
      {message?.text ? (
        <Notice tone={message.ok === false ? "error" : "success"}>
          {message.text}
          {message.code ? (
            <>
              {" "}
              New claim code (shown once): <strong className="font-mono">{message.code}</strong>
            </>
          ) : null}
        </Notice>
      ) : null}
      <ActionForm action={reassignCardAction.bind(null, cardId)} submitLabel="Reassign card" variant="secondary">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Move to customer (email)
          <input name="email" type="email" className={inputClass} />
        </label>
      </ActionForm>
    </div>
  );
}
