import "server-only";
import Stripe from "stripe";
import type { CheckoutCreated, CheckoutRequest, PaymentEvent, PaymentProvider } from "./types";
import { WebhookVerificationError } from "./types";

/**
 * Stripe Checkout (hosted). Card details are entered on Stripe's page and
 * never touch this server.
 * UNTESTED against the live Stripe API until STRIPE_SECRET_KEY (test mode)
 * and STRIPE_WEBHOOK_SECRET are configured. Webhook signature verification
 * and event mapping are covered by tests using Stripe's own test-signature helper.
 */
export class StripeProvider implements PaymentProvider {
  readonly name = "stripe" as const;
  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, { appInfo: { name: "nfc-cards" }, maxNetworkRetries: 2, timeout: 15_000 });
  }

  async createCheckout(request: CheckoutRequest): Promise<CheckoutCreated> {
    const currency = request.currency.toLowerCase();
    const taxBehavior = request.taxInclusive ? "inclusive" : "exclusive";
    const session = await this.stripe.checkout.sessions.create(
      {
        mode: "payment",
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
        customer_email: request.customerEmail,
        client_reference_id: request.attemptId,
        metadata: { attemptId: request.attemptId },
        line_items: request.lines.map((line) => ({
          quantity: line.quantity,
          price_data: {
            currency,
            unit_amount: line.unitAmount,
            tax_behavior: taxBehavior,
            product_data: { name: line.name, ...(line.description ? { description: line.description } : {}) },
          },
        })),
        shipping_address_collection: {
          allowed_countries: request.allowedCountries as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
        },
        shipping_options: request.shippingRates.map((rate) => ({
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: rate.name,
            fixed_amount: { amount: rate.amount, currency },
            tax_behavior: taxBehavior,
            delivery_estimate: {
              minimum: { unit: "business_day", value: rate.minDays },
              maximum: { unit: "business_day", value: rate.maxDays },
            },
          },
        })),
        automatic_tax: { enabled: request.taxEnabled },
      },
      { idempotencyKey: `checkout-${request.attemptId}` },
    );
    if (!session.url) throw new Error("Stripe did not return a Checkout URL");
    return { sessionId: session.id, url: session.url };
  }

  /** Verifies the `stripe-signature` header against the raw body, then maps the event. */
  static verifyWebhook(rawBody: string, signature: string | null, secret: string): PaymentEvent {
    if (!signature) throw new WebhookVerificationError("Missing signature");
    let event: Stripe.Event;
    try {
      event = Stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new WebhookVerificationError("Invalid signature");
    }
    return StripeProvider.mapEvent(event);
  }

  static mapEvent(event: Stripe.Event): PaymentEvent {
    switch (event.type) {
      // async_payment_succeeded carries the same full Checkout Session, now paid (e.g. bank debits).
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const s = event.data.object;
        const shipping = s.collected_information?.shipping_details ?? null;
        return {
          kind: "checkout.completed",
          eventId: event.id,
          sessionId: s.id,
          paid: s.payment_status === "paid" || s.payment_status === "no_payment_required",
          paymentIntentId: typeof s.payment_intent === "string" ? s.payment_intent : (s.payment_intent?.id ?? null),
          email: s.customer_details?.email ?? s.customer_email ?? null,
          currency: s.currency?.toUpperCase() ?? "",
          amountSubtotal: s.amount_subtotal ?? 0,
          amountShipping: s.total_details?.amount_shipping ?? 0,
          amountTax: s.total_details?.amount_tax ?? 0,
          amountTotal: s.amount_total ?? 0,
          shippingName: shipping?.name ?? s.customer_details?.name ?? null,
          shippingAddress: shipping?.address
            ? {
                line1: shipping.address.line1 ?? null,
                line2: shipping.address.line2 ?? null,
                city: shipping.address.city ?? null,
                state: shipping.address.state ?? null,
                postalCode: shipping.address.postal_code ?? null,
                country: shipping.address.country ?? null,
              }
            : null,
        };
      }
      case "checkout.session.async_payment_failed":
        return { kind: "checkout.payment_failed", eventId: event.id, sessionId: event.data.object.id };
      case "checkout.session.expired":
        return { kind: "checkout.expired", eventId: event.id, sessionId: event.data.object.id };
      default:
        return { kind: "ignored", eventId: event.id, type: event.type };
    }
  }
}
