import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, magicLink, twoFactor } from "better-auth/plugins";
import { brand } from "@/config/brand";
import { env } from "@/config/env";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendEmail } from "@/server/email";
import { magicLinkMessage, resetPasswordMessage, verifyEmailMessage } from "@/server/email/templates";

/** Relaxed limits are only honoured when APP_ENV=test (the e2e suite). */
const relaxLimits = env.appEnv === "test" && process.env.E2E_RELAX_RATE_LIMITS === "true";
const limit = (window: number, max: number) => ({ window, max: relaxLimits ? max * 50 : max });

/** Fire-and-forget so response timing doesn't reveal whether an account exists. */
function deliver(message: Parameters<typeof sendEmail>[0]) {
  void sendEmail(message).catch((error: unknown) => {
    console.error("[email] delivery failed:", error instanceof Error ? error.message : "unknown error");
  });
}

export const auth = betterAuth({
  appName: brand.name,
  baseURL: env.appUrl,
  secret: env.authSecret,
  trustedOrigins: [env.appUrl],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      twoFactor: schema.twoFactor,
      rateLimit: schema.rateLimit,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => deliver(resetPasswordMessage(user.email, url)),
  },
  emailVerification: {
    sendOnSignUp: true,
    // The sign-in form re-sends with the right callback URL itself.
    sendOnSignIn: false,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60,
    sendVerificationEmail: async ({ user, url }) => deliver(verifyEmailMessage(user.email, url)),
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh daily
    freshAge: 60 * 15, // sensitive actions (delete account, change email) need a sign-in in the last 15 min
  },
  rateLimit: {
    enabled: true,
    storage: env.isProduction ? "database" : "memory",
    window: 60,
    max: relaxLimits ? 5000 : 100,
    customRules: {
      "/sign-in/email": limit(60, 5),
      "/sign-up/email": limit(60 * 10, 5),
      "/sign-in/magic-link": limit(60 * 10, 5),
      "/request-password-reset": limit(60 * 10, 3),
      "/send-verification-email": limit(60 * 10, 3),
      "/two-factor/verify-totp": limit(60, 5),
      "/two-factor/verify-backup-code": limit(60, 5),
    },
  },
  advanced: {
    useSecureCookies: env.appUrl.startsWith("https://"),
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: env.appUrl.startsWith("https://") },
  },
  plugins: [
    magicLink({
      expiresIn: 60 * 10,
      // Magic links sign existing users in; new accounts go through sign-up + verification.
      disableSignUp: true,
      sendMagicLink: async ({ email, url }) => deliver(magicLinkMessage(email, url)),
    }),
    twoFactor({ issuer: brand.name }),
    admin({ defaultRole: "user", adminRoles: ["admin"] }),
    nextCookies(), // must be last
  ],
});

export type Session = typeof auth.$Infer.Session;
