import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

export const env = {
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  get cardDomain() {
    return (process.env.CARD_DOMAIN ?? this.appUrl).replace(/\/$/, "");
  },
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get authSecret() {
    return required("BETTER_AUTH_SECRET");
  },
  get claimCodeSecret() {
    return required("CLAIM_CODE_SECRET");
  },
  emailProvider: (process.env.EMAIL_PROVIDER ?? "console") as "console" | "resend",
  emailFrom: process.env.EMAIL_FROM ?? "Tessera <hello@example.com>",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  /**
   * Deployment environment. Defaults from NODE_ENV, but can be set to "test" so
   * the e2e suite can run a production build locally. Never set "test" in production.
   */
  appEnv: (process.env.APP_ENV ?? (process.env.NODE_ENV === "production" ? "production" : "development")) as
    | "development"
    | "test"
    | "production",
  get isProduction() {
    return this.appEnv === "production";
  },
  analyticsEnabled: process.env.ANALYTICS_ENABLED === "true",
};
