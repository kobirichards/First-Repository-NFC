# Tessera — build plan

Tessera is a placeholder brand name (from the Roman *tessera hospitalis*, a token given to a guest so they could be recognised later). It lives in one config value, `src/config/brand.ts`, and can be swapped.

The build brief is in `docs/brief.md`. This file records how it will be met.

## Architecture

```
Browser ──▶ Next.js 16 (App Router, React 19, TypeScript strict)
              ├─ Public pages: storefront, info pages, /p/{slug} profiles
              ├─ /c/{token}  card resolver (route handler, 307 + no-store)
              ├─ Dashboard (signed-in customers)
              ├─ Admin (role = admin, MFA required)
              ├─ /api/auth/*  Better Auth handler
              ├─ /api/stripe/webhook  (Milestone 3)
              └─ Server actions (all re-check session + ownership)
                     │
        ┌────────────┼─────────────────────┬──────────────────┐
   PostgreSQL     Email interface      Storage interface    Payments interface
   (Drizzle ORM,  dev: console +       dev: local disk      Stripe Checkout
   node-postgres) .mail-outbox/         prod: S3/R2          (test mode)
                  prod: Resend
```

- **Next.js 16** with Cache Components (the scaffold default). Marketing pages prerender into a static shell. Anything that reads the session sits behind `<Suspense>`, or the segment sets `instant = false`.
- **Auth: Better Auth** rather than Auth.js. Better Auth supports email + password, email verification, magic links, TOTP two-factor (needed for admin MFA), roles and built-in rate limiting. Auth.js discourages password sign-in and has no built-in MFA. Sessions are database sessions in httpOnly, `SameSite=Lax`, `Secure` (in production) cookies.
- **ORM: Drizzle** rather than Prisma. Prisma's migration engine is a native binary downloaded at install time, and this build environment blocks that download. Drizzle is plain TypeScript with SQL migrations in `drizzle/`, which also keeps CI and serverless deploys simple. The brief allows either.
- **Data access layer**: every customer read and write goes through `src/server/*` functions. Each takes the session user and scopes queries by `userId`. Pages and actions never query the database for user-owned rows directly.
- **Integration boundaries**: `src/server/email`, `src/server/storage` and (later) `src/server/payments` each define an interface with a dev implementation and a production implementation chosen by env vars. Production implementations stay untested until credentials exist.

## Data model (summary; see `src/db/schema.ts`)

| Model | Purpose |
|---|---|
| `User`, `Session`, `Account`, `Verification`, `TwoFactor` | Better Auth tables. `User.role` is `user` or `admin`. |
| `Profile` | One per user (MVP). Public slug, display fields, a public/hidden flag per optional field, `allowIndexing`, nullable `organisationId`. |
| `Card` | Physical card. `token` (128-bit random, base64url) never changes. `claimCodeHash`, `status` (UNCLAIMED / ACTIVE / DEACTIVATED), `destination` (PROFILE / LINKEDIN), current `ownerId` + `profileId`, nullable `organisationId`. |
| `CardAssignment` | History of who a card was assigned to, by whom, and when. |
| `CardBatch` | A batch of generated tokens for the printer. |
| `Product`, `ProductOption`, `Price` | Catalogue. Prices are integer minor units per currency (GBP / EUR / USD). |
| `Cart`, `CartItem` | Persistent cart, keyed by user or by an anonymous cart cookie. |
| `Order`, `OrderItem`, `Refund` | Orders created only from verified Stripe webhooks. Refunds are recorded; Stripe issues them. |
| `ArtworkProof` | Uploaded logo/artwork for custom print, with an approval state. |
| `Enquiry` | Corporate/team enquiries. |
| `AuditEvent` | Admin actions: actor, action, entity, before/after JSON. |
| `DailyStat` | Optional aggregate tap/view counts by day. No visitor identifiers. |
| `StripeEvent` | Processed webhook event IDs, for idempotency. |

## Card URL model

- `https://{CARD_DOMAIN}/c/{token}` is written to the chip and encoded in the QR code. The token is 16 random bytes in base64url (22 characters), generated with `crypto.randomBytes`.
- The resolver always answers with a **307 and `Cache-Control: no-store`**:
  - UNCLAIMED → `/activate/{token}`
  - ACTIVE + PROFILE → `/p/{slug}`
  - ACTIVE + LINKEDIN → the validated LinkedIn URL (falls back to the profile if missing)
  - ACTIVE but profile not published → a neutral "not set up yet" page
  - DEACTIVATED or unknown token → `/c/inactive` (identical for both, so it doesn't reveal which tokens exist)
- **Claim codes** are 10 characters from an unambiguous alphabet (about 50 bits). Only an HMAC-SHA256 of each code is stored, keyed with `CLAIM_CODE_SECRET`. Plain codes appear only in the batch CSV, which can be downloaded once when the batch is created. Claim attempts are rate-limited per user and per card.

## Assumptions

1. Email verification is required before **signing in**, not just before publishing a profile. This is stricter than the brief, and simpler and safer: nothing in the dashboard is reachable without a verified email.
2. One profile per user for now. The schema allows changing that later (the unique index on `Profile.userId` is the only constraint).
3. Prices are fixed per currency and stored in minor units. The default currency comes from `Accept-Language`, with an overriding cookie set by the switcher.
4. Tax is configuration only until Stripe Tax is enabled on a real Stripe account. Displayed UK/EU prices are VAT-inclusive; US prices exclude sales tax.
5. Dev email is written to the console and to `.mail-outbox/*.json`. This lets Playwright read verification links without a mail server.
6. `CARD_DOMAIN` defaults to `APP_URL`. In production they should be the same permanent domain.
7. Organisation/team accounts are out of scope. Profiles and cards have a nullable `organisationId` column with no relation yet.
8. This workspace runs Postgres natively for development. The repo ships `docker-compose.yml` for anyone else.
9. Fonts are self-hosted from npm (`@fontsource-variable`), so no request goes to Google Fonts and the CSP can stay `font-src 'self'`.
10. `APP_ENV` (development / test / production) is separate from `NODE_ENV`, so the e2e suite can run a production build with test-only settings (relaxed rate limits, console email). Never set `APP_ENV=test` on a real deployment.

## Milestones and acceptance criteria

1. **Foundation.** Project setup, Docker Postgres, full schema + migration + seed, auth (sign up, verify email, sign in/out, reset password, magic link), base layout and design system.
   *Done when:* a user can sign up, verify, sign in and out (proven by a Playwright test); lint, type check and tests pass.
2. **Cards and profiles.** Profile editor with visibility toggles, photo upload (re-encoded, EXIF stripped), public profile, vCard, QR codes, `/c/{token}` with every state, claiming, destination choice, deactivation.
   *Done when:* tests prove a user can't read or modify another user's profile or cards, and every card state resolves correctly.
3. **Storefront and checkout.** Product pages, multi-currency pricing, cart, Stripe Checkout (test mode), webhook-driven orders, order history, confirmation email.
   *Done when:* a Playwright test completes a test purchase with Stripe test keys, or the boundary is clearly marked untested if keys are absent.
4. **Admin and fulfilment.** Roles, MFA, product/order/customer management, card batches + CSV/QR zip export, assignment, artwork proofs, audit log, enquiry inbox.
   *Done when:* tests prove non-admins are rejected by every admin route and action.
5. **Polish and launch prep.** Content pages, SEO, accessibility (axe) and performance passes, optional analytics, full documentation.
   *Done when:* all checks pass and README, STATUS, `docs/nfc-programming.md` and `docs/launch-checklist.md` exist.

## Design system

- **Subject:** premium stationery that happens to be digital: engraved card stock, a bottle-green ink, a small brass detail.
- **Palette:** paper `#F5F6F3`, ink `#14231E`, bottle `#1F4D3F` (primary), brass `#B38B3F` (decorative only; it fails contrast for small text), stone `#DCE1DC` (rules, borders), moss `#5B6B64` (secondary text).
- **Type:** Schibsted Grotesk for everything, with a tight scale (1.25 ratio) and weight doing the hierarchy.
- **Signature moment:** the home hero renders a card being tapped against a phone, and the profile appears on the phone. It is the one orchestrated animation, and it is turned off under `prefers-reduced-motion`.
- Left-aligned layouts, a generous measure for text (max ~68ch), and varied section shapes rather than a grid of identical cards.
