/**
 * Checks a production deployment's environment variables before the server
 * takes requests. Returns variable NAMES only, never values, so the result is
 * safe to log.
 */

type Env = Record<string, string | undefined>;

export type EnvReport = { errors: string[]; warnings: string[] };

const PLACEHOLDER = /replace-me|changeme|example|e2e-only|itest/i;

function isHttpsPublicUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);
  } catch {
    return false;
  }
}

function checkSecret(env: Env, name: string, errors: string[]) {
  const value = env[name];
  if (!value) errors.push(`${name} is not set.`);
  else if (value.length < 32) errors.push(`${name} must be at least 32 characters (use \`openssl rand -base64 32\`).`);
  else if (PLACEHOLDER.test(value)) errors.push(`${name} still looks like a placeholder or a test value.`);
}

export function checkProductionEnv(env: Env): EnvReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isHttpsPublicUrl(env.APP_URL)) errors.push("APP_URL must be your public https:// address.");
  if (env.CARD_DOMAIN && !isHttpsPublicUrl(env.CARD_DOMAIN)) errors.push("CARD_DOMAIN must be an https:// address.");
  if (!env.CARD_DOMAIN) warnings.push("CARD_DOMAIN is not set, so cards use APP_URL. Set it explicitly: it's written to every chip.");

  if (!env.DATABASE_URL) errors.push("DATABASE_URL is not set.");
  else if (/@(localhost|127\.0\.0\.1)[:/]/.test(env.DATABASE_URL)) errors.push("DATABASE_URL points at a local database.");

  checkSecret(env, "BETTER_AUTH_SECRET", errors);
  checkSecret(env, "CLAIM_CODE_SECRET", errors);
  if (env.BETTER_AUTH_SECRET && env.BETTER_AUTH_SECRET === env.CLAIM_CODE_SECRET) {
    errors.push("BETTER_AUTH_SECRET and CLAIM_CODE_SECRET must be different.");
  }

  if (env.EMAIL_PROVIDER !== "resend") errors.push('EMAIL_PROVIDER must be "resend" in production.');
  else if (!env.RESEND_API_KEY) errors.push("RESEND_API_KEY is not set.");
  if (!env.EMAIL_FROM || /example\.com/i.test(env.EMAIL_FROM)) errors.push("EMAIL_FROM must use your verified sending domain.");

  const payments = env.PAYMENTS_PROVIDER || (env.STRIPE_SECRET_KEY ? "stripe" : "simulated");
  if (payments !== "stripe") errors.push('PAYMENTS_PROVIDER must be "stripe" in production.');
  if (!env.STRIPE_SECRET_KEY) errors.push("STRIPE_SECRET_KEY is not set.");
  else if (/^(sk|rk)_test_/.test(env.STRIPE_SECRET_KEY))
    warnings.push("STRIPE_SECRET_KEY is a test-mode key: no real payments will be taken.");
  if (!env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_")) errors.push("STRIPE_WEBHOOK_SECRET is not set (it starts with whsec_).");

  if (env.STORAGE_PROVIDER !== "s3") errors.push('STORAGE_PROVIDER must be "s3": local disk is wiped on serverless hosts.');
  else {
    for (const name of ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]) if (!env[name]) errors.push(`${name} is not set.`);
  }

  if (!env.UPSTASH_REDIS_REST_URL || !env.UPSTASH_REDIS_REST_TOKEN) {
    warnings.push("Upstash is not configured, so rate limits are per server instance rather than shared.");
  }
  if (env.E2E_RELAX_RATE_LIMITS === "true") errors.push("E2E_RELAX_RATE_LIMITS must not be set in production.");

  for (const name of Object.keys(env)) {
    if (name.startsWith("NEXT_PUBLIC_") && /SECRET|TOKEN|PASSWORD|PRIVATE|_KEY/i.test(name)) {
      errors.push(`${name} would be bundled into the browser. Secrets must not start with NEXT_PUBLIC_.`);
    }
  }

  return { errors, warnings };
}
