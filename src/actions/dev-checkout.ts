"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { shippingRates } from "@/config/commerce";
import { db } from "@/db";
import { checkoutSession } from "@/db/schema";
import { UserFacingError } from "@/server/errors";
import { processPaymentEvent } from "@/server/orders";
import { simulatedPaymentsEnabled } from "@/server/payments";
import { type ActionState, toActionError } from "./result";

/*
 * DEVELOPMENT ONLY: completes a simulated checkout by feeding the same
 * provider-neutral event into the same processing code a verified Stripe
 * webhook would. Disabled unless the simulated provider is active and
 * APP_ENV isn't production.
 */

const formSchema = z.object({
  email: z.email("Enter an email address."),
  name: z.string().trim().min(1, "Enter a name.").max(100),
  line1: z.string().trim().min(1, "Enter an address.").max(200),
  city: z.string().trim().min(1, "Enter a town or city.").max(100),
  postalCode: z.string().trim().min(1, "Enter a postcode.").max(20),
  country: z.string().trim().length(2),
  shippingRate: z.string().max(40),
});

async function loadOpenSession(sessionId: string) {
  if (!simulatedPaymentsEnabled()) throw new UserFacingError("Simulated checkout is turned off.");
  const snapshot = await db.query.checkoutSession.findFirst({ where: eq(checkoutSession.id, sessionId) });
  if (!snapshot || snapshot.provider !== "simulated") throw new UserFacingError("This checkout doesn't exist.");
  if (snapshot.status !== "open") throw new UserFacingError("This checkout has already finished.");
  return snapshot;
}

export async function completeSimulatedCheckout(sessionId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const snapshot = await loadOpenSession(sessionId);
    const input = formSchema.parse(Object.fromEntries(formData));
    const rate = shippingRates[snapshot.currency].find((r) => r.id === input.shippingRate) ?? shippingRates[snapshot.currency][0];
    await processPaymentEvent({
      kind: "checkout.completed",
      eventId: `sim_evt_${crypto.randomUUID().replace(/-/g, "")}`,
      sessionId,
      paid: true,
      paymentIntentId: null,
      email: input.email.toLowerCase(),
      currency: snapshot.currency,
      amountSubtotal: snapshot.subtotal,
      amountShipping: rate.amount,
      amountTax: 0,
      amountTotal: snapshot.subtotal + rate.amount,
      shippingName: input.name,
      shippingAddress: { line1: input.line1, line2: null, city: input.city, state: null, postalCode: input.postalCode, country: input.country },
    });
  } catch (error) {
    return toActionError(error);
  }
  redirect(`/checkout/success?session_id=${encodeURIComponent(sessionId)}`);
}

export async function cancelSimulatedCheckout(sessionId: string): Promise<void> {
  const snapshot = await loadOpenSession(sessionId);
  await processPaymentEvent({ kind: "checkout.expired", eventId: `sim_evt_${crypto.randomUUID().replace(/-/g, "")}`, sessionId: snapshot.id });
  redirect("/cart?cancelled=1");
}
