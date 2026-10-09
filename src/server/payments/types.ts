import type { Currency, ShippingRate } from "@/config/commerce";

export type CheckoutRequest = {
  /** Our snapshot-independent idempotency key for this attempt. */
  attemptId: string;
  currency: Currency;
  lines: Array<{ name: string; description?: string; unitAmount: number; quantity: number }>;
  shippingRates: ShippingRate[];
  allowedCountries: string[];
  customerEmail?: string;
  taxEnabled: boolean;
  taxInclusive: boolean;
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutCreated = { sessionId: string; url: string };

export type PostalAddress = {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

/** Provider-neutral webhook events. Amounts are minor units, as reported by the provider (authoritative). */
export type PaymentEvent =
  | {
      kind: "checkout.completed";
      eventId: string;
      sessionId: string;
      paid: boolean;
      paymentIntentId: string | null;
      email: string | null;
      currency: string;
      amountSubtotal: number;
      amountShipping: number;
      amountTax: number;
      amountTotal: number;
      shippingName: string | null;
      shippingAddress: PostalAddress | null;
    }
  | { kind: "checkout.payment_failed"; eventId: string; sessionId: string }
  | { kind: "checkout.expired"; eventId: string; sessionId: string }
  | { kind: "ignored"; eventId: string; type: string };

export interface PaymentProvider {
  readonly name: "stripe" | "simulated";
  createCheckout(request: CheckoutRequest): Promise<CheckoutCreated>;
}

export class WebhookVerificationError extends Error {}
