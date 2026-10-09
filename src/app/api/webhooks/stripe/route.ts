import type { NextRequest } from "next/server";
import { processPaymentEvent } from "@/server/orders";
import { StripeProvider } from "@/server/payments/stripe";
import { WebhookVerificationError } from "@/server/payments/types";
import { logError } from "@/server/log";

/**
 * Stripe webhook endpoint. Orders are created here, from verified events
 * only, never from the browser returning to the success page.
 * Subscribe to: checkout.session.completed, checkout.session.async_payment_succeeded,
 * checkout.session.async_payment_failed, checkout.session.expired.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "Webhook not configured" }, { status: 503 });

  const rawBody = await request.text();
  let event;
  try {
    event = StripeProvider.verifyWebhook(rawBody, request.headers.get("stripe-signature"), secret);
  } catch (error) {
    if (error instanceof WebhookVerificationError) return Response.json({ error: "Invalid signature" }, { status: 400 });
    throw error;
  }

  try {
    const result = await processPaymentEvent(event);
    return Response.json({ received: true, status: result.status });
  } catch (error) {
    // 500 makes Stripe retry; the transaction rolled back, so the retry starts clean.
    logError("webhook.stripe", error, { kind: event.kind, eventId: event.eventId });
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}
