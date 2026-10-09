import "server-only";
import type { CheckoutCreated, CheckoutRequest, PaymentProvider } from "./types";

/**
 * DEVELOPMENT ONLY. Stands in for Stripe so the whole purchase flow can be
 * run and tested without an account: "checkout" is a local page
 * (/dev/checkout/…) that clearly says no payment is taken. Refused when
 * APP_ENV=production.
 */
export class SimulatedProvider implements PaymentProvider {
  readonly name = "simulated" as const;

  constructor(private readonly appUrl: string) {}

  async createCheckout(request: CheckoutRequest): Promise<CheckoutCreated> {
    const sessionId = `sim_cs_${request.attemptId.replace(/-/g, "")}`;
    return { sessionId, url: `${this.appUrl}/dev/checkout/${sessionId}` };
  }
}
