# Status

_Last updated: Milestone 1 complete._

| Milestone | State |
|---|---|
| 1. Foundation | ✅ Done |
| 2. Cards and profiles | Not started |
| 3. Storefront and checkout | Not started |
| 4. Admin and fulfilment | Not started |
| 5. Polish and launch prep | Not started |

## Milestone 1: Foundation

### Built

- Next.js 16 + TypeScript (strict) + Tailwind 4 project, with security headers (CSP, HSTS in production, nosniff, referrer policy, frame denial, permissions policy).
- PostgreSQL schema for the **whole** product (auth, profiles, cards, assignments, batches, catalogue, carts, orders, refunds, artwork proofs, enquiries, audit log, daily stats, Stripe event idempotency) as one Drizzle migration. Nullable `organisationId` on profiles and cards for future team accounts.
- Docker Compose Postgres (with a `nfc_test` database), migration runner, and an idempotent seed: demo customer + admin, published demo profile, cards in every state (active→profile, active→LinkedIn, deactivated, two unclaimed), and the placeholder catalogue in GBP/EUR/USD.
- Card token and claim-code helpers: 128-bit tokens; 10-character claim codes stored only as an HMAC.
- Auth with Better Auth: sign up, email verification (required before sign-in), sign in/out, password reset (signs out other sessions), magic-link sign-in for existing accounts, and a TOTP two-factor sign-in step (enrolment UI comes in Milestone 4). Rate limits on sign-in, sign-up, reset, magic link, verification resend and 2FA.
- Email boundary: a console/outbox sender for development and a Resend sender for production.
- Design system: tokens, self-hosted Schibsted Grotesk, button, field, notice and container primitives, site header/footer, an auth layout, a dashboard shell, and a home page with the tap animation (static under reduced motion).

### Tested

- `npm run lint`, `npm run typecheck`, `npm run build`: pass.
- Unit (Vitest, 20 tests): open-redirect guard, email template escaping, auth error messages that never leak internals, token format and uniqueness, claim-code hashing and normalisation.
- End-to-end (Playwright on a production build against a fresh test database, 6 tests):
  - sign up → unverified sign-in blocked → open the emailed confirmation link → dashboard → sign out → protected page redirects → sign back in
  - wrong-password message
  - full password reset by email
  - magic-link sign-in by email
  - signed-out redirect and `?next=` open-redirect guard
  - security headers present, `X-Powered-By` absent
- Manually: the seeded demo customer can sign in.

### Simulated or untested

- **Resend email sender: untested.** It needs `RESEND_API_KEY` and a verified domain.
- Production rate limiting uses Better Auth's database store for auth endpoints. The Upstash limiter for app endpoints (claims, forms, `/c/`, `/p/`) arrives in Milestone 2.
- The two-factor sign-in step is built but not yet exercised by tests; enrolment and admin MFA enforcement are Milestone 4.

### Known gaps and follow-ups

- Header and footer link to pages that don't exist yet (shop, teams, info pages); they arrive in Milestones 3 and 5.
- The dashboard nav links to Profile, Cards, Orders and Account sections that arrive in Milestones 2–3. Account deletion and data export are Milestone 2 (Account section).
- The CSP allows `'unsafe-inline'` scripts because Next's bootstrap scripts are inline and nonces would make every page dynamic. Revisit with Next's experimental SRI support before launch.

## Future work (out of scope for this build)

- Team/organisation accounts (company admin manages staff profiles and reassigns cards when people leave). The schema already reserves `organisationId`.
- CRM integrations (HubSpot, Salesforce) and lead capture from profile visitors.
- Apple/Google Wallet passes.
