import "server-only";
import { env } from "@/config/env";
import { SimulatedProvider } from "./simulated";
import { StripeProvider } from "./stripe";
import type { PaymentProvider } from "./types";

/**
 * PAYMENTS_PROVIDER=stripe | simulated. Defaults to Stripe when a secret key
 * is set, otherwise the simulated provider (never allowed in production).
 */
export function paymentsProviderName(): "stripe" | "simulated" {
  const configured = process.env.PAYMENTS_PROVIDER;
  if (configured === "stripe" || configured === "simulated") return configured;
  return process.env.STRIPE_SECRET_KEY ? "stripe" : "simulated";
}

export function getPaymentProvider(): PaymentProvider {
  if (paymentsProviderName() === "stripe") {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("PAYMENTS_PROVIDER=stripe but STRIPE_SECRET_KEY is not set");
    return new StripeProvider(key);
  }
  if (env.isProduction) throw new Error("The simulated payment provider cannot be used in production");
  return new SimulatedProvider(env.appUrl);
}

export function simulatedPaymentsEnabled() {
  return paymentsProviderName() === "simulated" && !env.isProduction;
}
