"use client";

import { useActionState } from "react";
import { cancelSimulatedCheckout, completeSimulatedCheckout } from "@/actions/dev-checkout";
import type { ActionState } from "@/actions/result";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";

export function SimulatedCheckoutForm({
  sessionId,
  email,
  countries,
  rates,
}: {
  sessionId: string;
  email: string;
  countries: string[];
  rates: Array<{ id: string; label: string }>;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(completeSimulatedCheckout.bind(null, sessionId), {});
  const err = (f: string) => state.fieldErrors?.[f];
  return (
    <form action={action} className="flex flex-col gap-5">
      {state.message && !state.ok ? <Notice tone="error">{state.message}</Notice> : null}
      <Field label="Email" name="email" type="email" defaultValue={email} required error={err("email")} />
      <Field label="Name" name="name" defaultValue="Test Customer" required error={err("name")} />
      <Field label="Address" name="line1" defaultValue="1 Test Street" required error={err("line1")} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Town or city" name="city" defaultValue="London" required error={err("city")} />
        <Field label="Postcode" name="postalCode" defaultValue="N12 0AA" required error={err("postalCode")} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="country" className="text-sm font-semibold">
          Country
        </label>
        <select id="country" name="country" className="h-11 rounded-control border border-ink/20 bg-sheet px-3">
          {countries.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold">Delivery</legend>
        {rates.map((r, i) => (
          <label key={r.id} className="flex items-center gap-2 text-sm">
            <input type="radio" name="shippingRate" value={r.id} defaultChecked={i === 0} className="accent-bottle" />
            {r.label}
          </label>
        ))}
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Completing…" : "Complete simulated payment"}
        </Button>
        <Button type="button" size="lg" variant="secondary" onClick={() => cancelSimulatedCheckout(sessionId)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
