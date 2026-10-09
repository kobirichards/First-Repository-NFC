"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";
import type { ActionState } from "@/actions/result";
import { removeItemAction, updateQuantityAction } from "@/actions/shop";
import { Button } from "@/components/ui/button";
import { MAX_QUANTITY_PER_LINE } from "@/config/commerce";

export function CartLineControls({
  line,
}: {
  line: {
    id: string;
    productSlug: string;
    productName: string;
    optionName: string | null;
    quantity: number;
    details: string[];
    unitLabel: string | null;
    totalLabel: string | null;
    problem: string | null;
  };
}) {
  const [state, update, updating] = useActionState<ActionState, FormData>(updateQuantityAction.bind(null, line.id), {});
  const [removing, startRemove] = useTransition();
  const name = line.optionName ? `${line.productName}, ${line.optionName}` : line.productName;

  return (
    <li className="grid gap-4 py-6 sm:grid-cols-[1fr_auto_auto] sm:items-start">
      <div>
        <Link href={`/shop/${line.productSlug}`} className="font-semibold hover:text-bottle">
          {name}
        </Link>
        {line.unitLabel ? <p className="text-sm text-moss">{line.unitLabel} each</p> : null}
        {line.details.map((d) => (
          <p key={d} className="text-sm text-moss">
            {d}
          </p>
        ))}
        {line.problem ? (
          <p role="alert" className="mt-1 text-sm font-medium text-danger">
            {line.problem}
          </p>
        ) : null}
      </div>
      <form action={update} noValidate className="flex items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`qty-${line.id}`} className="text-xs font-semibold text-moss">
            Quantity
          </label>
          <input
            id={`qty-${line.id}`}
            name="quantity"
            type="number"
            min={1}
            max={MAX_QUANTITY_PER_LINE}
            defaultValue={line.quantity}
            className="h-10 w-20 rounded-control border border-ink/20 bg-sheet px-2"
          />
        </div>
        <Button type="submit" variant="secondary" disabled={updating}>
          Update
        </Button>
        <Button variant="quiet" className="mb-2.5 text-sm" disabled={removing} onClick={() => startRemove(async () => void (await removeItemAction(line.id)))}>
          Remove<span className="sr-only"> {name}</span>
        </Button>
      </form>
      <p className="font-semibold sm:min-w-24 sm:text-right">{line.totalLabel ?? "Unavailable"}</p>
      {state.ok === false && state.message ? (
        <p role="alert" className="text-sm font-medium text-danger sm:col-span-3">
          {state.fieldErrors?.quantity ?? state.message}
        </p>
      ) : null}
    </li>
  );
}
