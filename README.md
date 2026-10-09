# Tessera: NFC business cards

A storefront and web app for selling NFC business cards. Each card stores a permanent link (`/c/{token}`) that opens the cardholder's hosted profile, or their LinkedIn, and the owner can change that at any time without replacing the card.

> **Tessera** is a placeholder brand name. Change it in `src/config/brand.ts`.

- Build brief: [`docs/brief.md`](docs/brief.md)
- Architecture, data model and assumptions: [`PLAN.md`](PLAN.md)
- Progress, what's tested and what isn't: [`STATUS.md`](STATUS.md)

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript (strict) · Tailwind CSS 4 · PostgreSQL + Drizzle ORM · Better Auth · Zod · Vitest · Playwright.

## Requirements

- Node.js 20.9 or newer (22 recommended)
- PostgreSQL 16, via Docker (`docker compose`) or installed locally

## Getting started

```bash
npm install
cp .env.example .env            # then set the two secrets (see below)
npm run db:up                   # starts Postgres in Docker (skip if you run your own)
npm run db:migrate              # applies migrations in ./drizzle
npm run db:seed                 # demo users, catalogue and cards in every state
npm run dev                     # http://localhost:3000
```

Generate the secrets with `openssl rand -base64 32` and paste them into `BETTER_AUTH_SECRET` and `CLAIM_CODE_SECRET`.

The seed prints the demo logins and the card URLs and claim codes:

| Account | Email | Password |
|---|---|---|
| Demo customer | `demo@example.com` | `demo-password-123` |
| Demo admin | `admin@example.com` | `demo-password-123` |

The seed refuses to run when `APP_ENV=production`.

### Emails in development

With `EMAIL_PROVIDER=console` nothing is sent. Each email is logged to the terminal and saved as JSON in `.mail-outbox/`; open the file to click the verification, reset or sign-in link.

## Environment variables

See [`.env.example`](.env.example) for the full list with comments. The important ones:

| Variable | Purpose |
|---|---|
| `APP_URL` | Public base URL, no trailing slash. Cookies are marked `Secure` when this is `https://`. |
| `CARD_DOMAIN` | The domain written to every NFC chip and QR code. **Treat it as permanent.** If it lapses or changes, every card ever sold stops working. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `BETTER_AUTH_SECRET` | Signs sessions and tokens. |
| `CLAIM_CODE_SECRET` | HMAC key for card claim codes. Changing it invalidates all unclaimed codes. |
| `EMAIL_PROVIDER` | `console` (development) or `resend` (needs `RESEND_API_KEY` and a verified domain). |
| `STORAGE_PROVIDER` | `local` (writes to `./.uploads`) or `s3` (any S3-compatible bucket such as R2; keep it private, since files are served through the app). |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Shared rate limiting in production. Without them the limiter is in-memory, per server. |
| `PAYMENTS_PROVIDER` | `stripe` or `simulated` (see Stripe test mode). |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Stripe API key and webhook signing secret. |
| `APP_ENV` | `development`, `test` or `production`. Defaults from `NODE_ENV`. Only the e2e suite uses `test`. |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generates route types, then `tsc --noEmit` |
| `npm test` | Unit + integration tests (Vitest). Integration tests reset the `nfc_itest` database. |
| `npm run test:e2e` | Builds, then runs Playwright against a fresh `nfc_test` database |
| `npm run check` | Lint + type check + unit tests |
| `npm run db:generate` | Creates a migration from changes to `src/db/schema.ts` |
| `npm run db:migrate` | Applies migrations |
| `npm run db:seed` | Seeds demo data |
| `npm run admin:create -- --email … --name …` | Creates (or promotes) an admin account |

### Integration tests

Integration tests run the data-access layer against a real database named in `ITEST_DATABASE_URL` (default `postgresql://postgres:postgres@localhost:5432/nfc_itest`; Docker Compose creates it). The suite resets it on each run.

### End-to-end tests

The e2e suite resets the database named in `TEST_DATABASE_URL` (default `postgresql://postgres:postgres@localhost:5432/nfc_test`). It refuses to run against a database whose name doesn't end in `_test`. Docker Compose creates `nfc_test` for you.

If Playwright can't find a browser, run `npx playwright install chromium`, or point it at an existing Chromium with `PLAYWRIGHT_CHROMIUM_PATH=/path/to/chrome`.

## Project layout

```
src/
  app/(site)/        public storefront pages
  app/(auth)/        sign up, sign in, password reset, email confirmation, 2FA
  app/(dashboard)/   signed-in customer area
  app/api/auth/      Better Auth handler
  components/        UI components (ui/ = design system primitives)
  config/            brand + environment config
  db/                Drizzle schema, migrations runner, seed
  lib/               auth server/client, helpers
  server/            server-only data access and integrations (email, cards…)
  actions/           server actions (each re-checks the session)
  proxy.ts           rate limits /c/ and /p/, real 404s for missing profiles, sign-in redirect for /dashboard and /admin
drizzle/             SQL migrations
tests/unit/          Vitest unit tests
tests/integration/   Vitest against Postgres (ownership, claiming, card states)
tests/e2e/           Playwright
```

## Deployment notes

Target: Vercel (or any Node host) plus managed Postgres (e.g. Neon). Not deployed yet.

1. Create the database and set every variable from `.env.example` (production values, `https`).
2. Run `npm run db:migrate` against the production database as a release step.
3. Set `EMAIL_PROVIDER=resend` with a verified sending domain. The console sender refuses to run in production.
4. Never set `APP_ENV=test`, and never run `db:seed`, in production.
5. Register `CARD_DOMAIN` for the long term, with auto-renew. See `docs/launch-checklist.md` (Milestone 5).

6. Set `PAYMENTS_PROVIDER=stripe`, live keys, and a webhook endpoint at `https://YOUR_DOMAIN/api/webhooks/stripe` (see below).

## Admin area

`/admin` is for staff. To get in you need:

1. **An admin account.** Create the first one from the command line (there's no public sign-up for admins):
   ```bash
   npm run admin:create -- --email you@company.com --name "Your Name"
   ```
   This prints a temporary password once. Running it with an existing customer's email promotes that account instead.
2. **Two-step verification.** On first visit, `/admin` sends you to set up an authenticator app. Nothing else in admin works until that's done, and every later sign-in needs a code. Admin accounts can't use email sign-in links.

Access is checked in three places:

- the proxy, which gives a real 404 to non-admins and handles the set-up redirect
- every admin page and server action, through `requireAdmin()`
- every admin data function, through `assertAdmin()`

Every change is recorded in **Admin → Audit log** with who made it and the before/after values.

Writing NFC chips is manual: see [`docs/nfc-programming.md`](docs/nfc-programming.md).

## Stripe test mode

Without Stripe keys, checkout uses a **simulated provider**: a local page at `/dev/checkout/…` that says plainly that no payment is taken, and that creates the order through the same code a verified Stripe webhook uses. It can't run when `APP_ENV=production`.

To use real Stripe Checkout in test mode:

1. Create a Stripe account and stay in **test mode**. Copy the secret key (`sk_test_…`) into `STRIPE_SECRET_KEY`.
2. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and forward webhooks to your machine:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe \
     --events checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired
   ```
   Copy the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET`, then restart `npm run dev`.
3. Buy something and pay with the test card `4242 4242 4242 4242`, any future expiry date and any CVC.
4. The order appears once the webhook arrives. The success page waits for it.

Orders are created **only** from verified webhooks, never from the browser returning to the success page. Each event is processed once, even if Stripe retries it.

**Tax:** prices are fixed per currency. UK/EU prices are VAT-inclusive; US prices exclude sales tax. Set `STRIPE_TAX_ENABLED=true` only after adding your tax registrations in Stripe; until then no tax is calculated. Shipping rates, countries and production times are in `src/config/commerce.ts`.
