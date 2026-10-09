"use client";

import { useActionState, useState, useTransition } from "react";
import { renameCardAction, setActiveAction, setDestinationAction } from "@/actions/cards";
import type { ActionState } from "@/actions/result";
import { Button } from "@/components/ui/button";

export type CardRow = {
  id: string;
  label: string | null;
  status: "UNCLAIMED" | "ACTIVE" | "DEACTIVATED";
  destination: "PROFILE" | "LINKEDIN";
  url: string;
  /** Taps in the last 30 days, or null when analytics is off. */
  taps: number | null;
};

function Feedback({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm font-medium text-bottle" : "text-sm font-medium text-danger"}>
      {state.message}
    </p>
  );
}

export function CardControls({ card, hasLinkedIn }: { card: CardRow; hasLinkedIn: boolean }) {
  const [renameState, rename] = useActionState<ActionState, FormData>(renameCardAction.bind(null, card.id), {});
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const active = card.status === "ACTIVE";
  const name = card.label ?? "Unnamed card";

  return (
    <li className="rounded-card border border-stone bg-sheet">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{name}</h2>
          <p className="mt-1 text-sm">
            {active ? (
              <span className="font-medium text-bottle">Active</span>
            ) : (
              <span className="font-medium text-danger">Deactivated: taps show a &ldquo;not active&rdquo; page</span>
            )}
          </p>
          <p className="mt-1 truncate text-sm text-moss" title={card.url}>
            {card.url}
          </p>
          {card.taps !== null ? (
            <p className="mt-1 text-sm text-moss">
              {card.taps} {card.taps === 1 ? "tap" : "taps"} in the last 30 days
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <a href={`/api/cards/${card.id}/qr?format=svg`} className="text-sm font-semibold text-bottle underline-offset-4 hover:underline">
            QR (SVG)
          </a>
          <a href={`/api/cards/${card.id}/qr?format=png`} className="text-sm font-semibold text-bottle underline-offset-4 hover:underline">
            QR (PNG)
          </a>
        </div>
      </div>

      <div className="grid gap-6 border-t border-stone p-5 md:grid-cols-2">
        <fieldset disabled={pending}>
          <legend className="text-sm font-semibold">When someone taps this card</legend>
          <div className="mt-3 flex flex-col gap-2">
            {(
              [
                ["PROFILE", "Open my profile", "Your page with contact details and a Save contact button."],
                ["LINKEDIN", "Go straight to my LinkedIn", hasLinkedIn ? "Skips your profile page." : "Add your LinkedIn address to your profile first."],
              ] as const
            ).map(([value, label, hint]) => (
              <label key={value} className="flex items-start gap-2.5 text-sm">
                <input
                  type="radio"
                  name={`destination-${card.id}`}
                  value={value}
                  defaultChecked={card.destination === value}
                  disabled={value === "LINKEDIN" && !hasLinkedIn}
                  className="mt-0.5 size-4 accent-bottle"
                  onChange={() => startTransition(async () => setState(await setDestinationAction(card.id, value)))}
                />
                <span>
                  {label}
                  <span className="block text-moss">{hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <form
          action={rename}
          className="flex flex-col gap-2"
        >
          <label htmlFor={`label-${card.id}`} className="text-sm font-semibold">
            Card name
          </label>
          <div className="flex gap-2">
            <input
              id={`label-${card.id}`}
              name="label"
              defaultValue={card.label ?? ""}
              maxLength={60}
              placeholder="e.g. Conference card"
              className="h-10 min-w-0 flex-1 rounded-control border border-ink/20 bg-sheet px-3 text-sm"
            />
            <Button type="submit" variant="secondary">
              Save
            </Button>
          </div>
          <p className="text-sm text-moss">Only you see this.</p>
          <Feedback state={renameState} />
        </form>
      </div>

      <div className="flex flex-col gap-3 border-t border-stone p-5">
        {active ? (
          confirming ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm leading-relaxed">
                Deactivating stops this card from opening your profile straight away. It doesn&apos;t erase the chip, so you can
                reactivate it later if you find it.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setState(await setActiveAction(card.id, false));
                      setConfirming(false);
                    })
                  }
                >
                  Deactivate card
                </Button>
                <Button variant="secondary" onClick={() => setConfirming(false)}>
                  Keep it active
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="quiet" className="self-start text-sm text-danger" onClick={() => setConfirming(true)}>
              Lost this card? Deactivate it
            </Button>
          )
        ) : (
          <Button
            variant="secondary"
            className="self-start"
            disabled={pending}
            onClick={() => startTransition(async () => setState(await setActiveAction(card.id, true)))}
          >
            Reactivate card
          </Button>
        )}
        <Feedback state={state} />
      </div>
    </li>
  );
}
