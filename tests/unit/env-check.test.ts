import { describe, expect, it } from "vitest";
import { checkProductionEnv } from "@/server/env-check";

const good = {
  APP_URL: "https://cards.example-brand.co.uk",
  CARD_DOMAIN: "https://cards.example-brand.co.uk",
  DATABASE_URL: "postgresql://user:pw@ep-cool-name.eu-west-2.aws.neon.tech/db?sslmode=require",
  BETTER_AUTH_SECRET: "q3Vt9mR2tLw8pZc1nB4dKaXy7Hs6Ju0Fe5Gi",
  CLAIM_CODE_SECRET: "Zr8Lp2Qw9Nv4Bx7Kc1Md6Hf3Jt5Gy0Sa2Ue",
  EMAIL_PROVIDER: "resend",
  RESEND_API_KEY: "re_abc",
  EMAIL_FROM: "Cards <hello@cards-brand.co.uk>",
  STRIPE_SECRET_KEY: "sk_live_abc",
  STRIPE_WEBHOOK_SECRET: "whsec_abc",
  STORAGE_PROVIDER: "s3",
  S3_BUCKET: "uploads",
  S3_ACCESS_KEY_ID: "id",
  S3_SECRET_ACCESS_KEY: "secret",
  UPSTASH_REDIS_REST_URL: "https://eu1.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "token",
};

describe("production environment check", () => {
  it("passes a complete production configuration", () => {
    expect(checkProductionEnv(good)).toEqual({ errors: [], warnings: [] });
  });

  it("rejects the development defaults from .env.example", () => {
    const { errors } = checkProductionEnv({
      APP_URL: "http://localhost:3000",
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/nfc",
      BETTER_AUTH_SECRET: "replace-me-with-a-long-random-string",
      CLAIM_CODE_SECRET: "replace-me-with-another-long-random-string",
      EMAIL_PROVIDER: "console",
      STORAGE_PROVIDER: "local",
    });
    const text = errors.join("\n");
    for (const name of [
      "APP_URL",
      "DATABASE_URL",
      "BETTER_AUTH_SECRET",
      "CLAIM_CODE_SECRET",
      "EMAIL_PROVIDER",
      "PAYMENTS_PROVIDER",
      "STORAGE_PROVIDER",
      "STRIPE_WEBHOOK_SECRET",
    ]) {
      expect(text).toContain(name);
    }
  });

  it("rejects short or reused secrets", () => {
    expect(checkProductionEnv({ ...good, BETTER_AUTH_SECRET: "short" }).errors.join()).toContain("at least 32");
    expect(checkProductionEnv({ ...good, CLAIM_CODE_SECRET: good.BETTER_AUTH_SECRET }).errors.join()).toContain("must be different");
  });

  it("flags secrets exposed to the browser and relaxed test limits", () => {
    const { errors } = checkProductionEnv({ ...good, NEXT_PUBLIC_STRIPE_SECRET_KEY: "sk_live", E2E_RELAX_RATE_LIMITS: "true" });
    expect(errors.join()).toContain("NEXT_PUBLIC_STRIPE_SECRET_KEY");
    expect(errors.join()).toContain("E2E_RELAX_RATE_LIMITS");
  });

  it("warns, but doesn't fail, on test-mode Stripe and missing Upstash", () => {
    const { errors, warnings } = checkProductionEnv({ ...good, STRIPE_SECRET_KEY: "sk_test_abc", UPSTASH_REDIS_REST_URL: "" });
    expect(errors).toEqual([]);
    expect(warnings).toHaveLength(2);
  });

  it("never includes secret values in its messages", () => {
    const report = checkProductionEnv({ ...good, BETTER_AUTH_SECRET: "replace-me-but-long-enough-0123456789" });
    expect(JSON.stringify(report)).not.toContain("replace-me-but-long-enough");
  });
});
