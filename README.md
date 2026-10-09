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
| `APP_ENV` | `development`, `test` or `production`. Defaults from `NODE_ENV`. Only the e2e suite uses `test`. |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generates route types, then `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Builds, then runs Playwright against a fresh `nfc_test` database |
| `npm run check` | Lint + type check + unit tests |
| `npm run db:generate` | Creates a migration from changes to `src/db/schema.ts` |
| `npm run db:migrate` | Applies migrations |
| `npm run db:seed` | Seeds demo data |

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
  proxy.ts           optimistic sign-in redirect for /dashboard and /admin
drizzle/             SQL migrations
tests/unit/          Vitest
tests/e2e/           Playwright
```

## Deployment notes

Target: Vercel (or any Node host) plus managed Postgres (e.g. Neon). Not deployed yet.

1. Create the database and set every variable from `.env.example` (production values, `https`).
2. Run `npm run db:migrate` against the production database as a release step.
3. Set `EMAIL_PROVIDER=resend` with a verified sending domain. The console sender refuses to run in production.
4. Never set `APP_ENV=test`, and never run `db:seed`, in production.
5. Register `CARD_DOMAIN` for the long term, with auto-renew. See `docs/launch-checklist.md` (Milestone 5).

Stripe setup instructions arrive with Milestone 3.
