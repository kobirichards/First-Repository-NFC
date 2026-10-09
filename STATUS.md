# Status

_Last updated: all five milestones complete._

| Milestone | State |
|---|---|
| 1. Foundation | ✅ Done |
| 2. Cards and profiles | ✅ Done |
| 3. Storefront and checkout | ✅ Done (real Stripe untested: no keys yet) |
| 4. Admin and fulfilment | ✅ Done |
| 5. Polish and launch prep | ✅ Done |

## Open issues to fix

Everything known to be missing, untested or wrong, in rough order of importance. Each item says what is needed to close it.

| # | Issue | Type | What's needed |
|---|---|---|---|
| 1 | **Real Stripe Checkout has never been run.** Purchases are tested end to end only with the simulated provider; the Stripe API call and hosted page are untested. | Untested integration | Stripe test keys → follow README "Stripe test mode" → one purchase with card 4242 → confirm the order appears via the webhook. |
| 2 | **Stripe Tax is off.** No tax is calculated at checkout; UK/EU prices are assumed VAT-inclusive. | Configuration | Tax registrations in Stripe, then `STRIPE_TAX_ENABLED=true` and a test purchase per region. |
| 3 | **Brand name "Tessera" is a placeholder**, and is likely to clash with existing trademarks. | Decision | Choose a name; change `src/config/brand.ts`; run a trademark search. |
| 4 | **Email (Resend) is untested.** Development emails are written to `.mail-outbox/`. | Untested integration | `RESEND_API_KEY` + verified domain (SPF/DKIM/DMARC); send a test of each email type. |
| 5 | **S3/R2 photo and logo storage is untested.** Development uses local disk. | Untested integration | A private bucket and `S3_*` variables; upload a photo and logo, run `npm run cleanup`. |
| 6 | **Shared rate limiting (Upstash) is untested.** Without it, limits are per server instance. | Untested integration | `UPSTASH_REDIS_REST_*`; check a 429 after repeated claim attempts. |
| 7 | **Legal pages are drafts** with bracketed placeholders (privacy, terms, cookies, shipping and returns). | Legal review | Professional review; see `docs/launch-checklist.md`. |
| 8 | **Prices, shipping rates, countries and production times are placeholders.** | Business decision | Set prices in Admin → Products; edit `src/config/commerce.ts`. |
| 9 | **NFC chips not yet written or tested on physical cards**; the metal card's on-metal inlay is unverified. | Operational | Test batch per `docs/nfc-programming.md`. |
| 10 | **Refund webhooks aren't handled** (`charge.refunded`). Refunds are issued in Stripe and recorded by hand in admin. | Gap | Handle `charge.refunded` to record refunds automatically. |
| 11 | **CSP allows inline scripts** (`'unsafe-inline'`), because Next's bootstrap scripts are inline and nonces would make every page dynamic. | Hardening | Try Next's experimental SRI support, or nonces on dynamic routes. |
| 12 | **Product page description is streamed**, not in the initial `<head>`, so Lighthouse SEO scores 91 there (search bots get it because Next waits for them). | Minor SEO | Cache product metadata (`"use cache"` + `cacheTag`) so it prerenders. |
| 13 | **Changing a profile address breaks old `/p/` links.** Cards are unaffected. | Gap | Keep old slugs and redirect them. |
| 14 | **A guest basket isn't merged** into the account when someone signs in after adding items. The basket stays with the browser. | Minor UX | Merge carts on sign-in. |
| 15 | **No admin screen to remove an admin or reset another admin's two-step verification.** | Gap | Add to the `admin:create` CLI or the admin area. Backup codes cover self-recovery. |
| 16 | **Admin success messages vanish when a form leaves the page** (e.g. an approved proof leaving the queue). The new state is shown, but not a confirmation. | Minor UX | Toast or flash message. |
| 17 | **Rate-limit client key trusts the first `X-Forwarded-For` hop.** Correct behind Vercel; may be spoofable on other hosts. | Deployment check | Confirm the host's proxy behaviour, or use its trusted client IP header. |
| 18 | **The code is on GitHub but not in a folder on your computer.** | Optional | Connect a folder in the desktop app, or `git clone` the repo. |
| 19 | **One profile per user**; profile photos are cropped automatically (no crop tool). | By design (for now) | Future work if wanted. |


## Accounts and credentials needed before launch

| Service | Used for | Variables |
|---|---|---|
| Domain registrar | The permanent card domain (multi-year, auto-renew) | `APP_URL`, `CARD_DOMAIN` |
| Host (e.g. Vercel) | Running the app, cron for `npm run cleanup` | all |
| Managed Postgres (e.g. Neon) | Database, with backups | `DATABASE_URL` |
| Stripe | Checkout, Stripe Tax, refunds | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_TAX_ENABLED` |
| Resend (or similar) | Account, order and admin emails | `EMAIL_PROVIDER`, `RESEND_API_KEY`, `EMAIL_FROM` |
| S3-compatible storage (e.g. Cloudflare R2) | Profile photos and logos (private bucket) | `STORAGE_PROVIDER`, `S3_*` |
| Upstash Redis | Shared rate limiting | `UPSTASH_REDIS_REST_*` |
| Card printer / NFC supplier | Cards, chips, packaging with claim codes | — |

Plus fresh `BETTER_AUTH_SECRET` and `CLAIM_CODE_SECRET`, the first admin via `npm run admin:create`, and the legal, tax and compliance items in [`docs/launch-checklist.md`](docs/launch-checklist.md).

## Milestone 5: Polish and launch prep

### Built

- **Content pages**: About, Contact (form saved as an enquiry, rate-limited, with a hidden honeypot field), and Shipping and returns. The shipping table comes from the same config as checkout, and the page explains the 14-day cancellation right and the exemption for printed cards. **Privacy, Terms and Cookies drafts** describe what the app really does: processors, no cookies on public profiles, and analytics wording that adapts to the flag. Every legal page carries the banner "Draft — requires review by a qualified professional before launch."
- **Home page**: use cases (conferences, stands, teams), and a testimonial section clearly labelled as a placeholder (no invented reviews).
- **SEO**: page titles and descriptions; `robots.txt` (private areas blocked); a `sitemap.xml` built from the database (public pages, products, and only the profiles whose owners opted in); a default Open Graph image; profiles `noindex` unless opted in.
- **Optional analytics** (`ANALYTICS_ENABLED`, off by default): daily totals of taps per card and views per profile, counted after the response is sent. No IPs, user agents, cookies or identifiers are stored, and obvious bots are skipped. Owners see "N taps in the last 30 days" per card and profile views on their overview.
- **Housekeeping**: `npm run cleanup` expires stale checkout sessions, deletes abandoned anonymous baskets, and deletes logos and photos no longer referenced. Storage gained a `list()` for this.
- **`docs/launch-checklist.md`**: business and trademark; UK/EU/US privacy (ICO, DPAs, DPIA, EU representative); cookies (PECR); VAT/OSS/US sales tax and Stripe Tax; consumer rights including personalised goods; product safety; accessibility; security and operations; fulfilment.

### Tested

- `npm run lint`, `npm run typecheck`, `npm run build`: pass.
- Vitest: **119 tests** (73 unit, 46 integration). New: analytics counts only when enabled, skips bots, stores no identifiers; the cleanup job keeps what's in use and removes the rest.
- Playwright: **61 tests**, all passing (20 functional, 36 accessibility, 5 content/SEO).
  - **Accessibility (axe, WCAG 2.0/2.1/2.2 A + AA)**: 16 public pages plus a public profile and all 6 signed-in pages, at **desktop and phone size**, with **zero violations**. A keyboard test checks the skip link. (I also confirmed axe genuinely catches injected violations, so a pass isn't a false clean.)
  - Content: draft banners, the placeholder label, the contact form, robots/sitemap rules, titles and the social image.
- **Lighthouse (mobile emulation, local production build):**

  | Page | Performance | Accessibility | Best practices | SEO |
  |---|---|---|---|---|
  | Public profile `/p/…` | **98** (LCP 1.0 s, CLS 0) | 100 | 100 | 66: deliberately `noindex` |
  | Home | 99 | 100 | 100 | 100 |
  | Product | 93 | 100 | 100 | 91: see open issue 12 |

### Simulated or untested

See **Open issues to fix** at the top.

## Milestone 4: Admin and fulfilment

### Built

- **Access control in three layers:**
  - the proxy (real 404 for non-admins; signed-out visitors sent to sign in; admins without two-step verification sent to set it up)
  - `requireAdmin()` at the start of every admin page and server action
  - `assertAdmin()` at the start of every admin data function

  Admin means role `admin` **and** two-step verification switched on. The Better Auth "admin" plugin was removed so none of its HTTP endpoints (set role, ban, impersonate) can bypass these checks; `role` is now a server-only user field.
- **Admin accounts**: `npm run admin:create` creates or promotes one, with a one-time temporary password, and logs it in the audit log. Authenticator-app set-up has a QR code, a manual key, backup codes and a confirmation step. Every admin sign-in then needs a code. Email sign-in links are refused for admins with a safe explanatory email, because they would skip the code.
- **Card batches**: create up to 1,000 cards. The CSV for the printer (token, URL, claim code, QR filename) downloads once and is the only copy of the codes. There's a QR zip per batch (one SVG per card plus a CSV without codes), and **New claim codes** recovers a lost CSV before printing. CSV cells are protected against spreadsheet formula injection, and tokens never start with `-` or `_`.
- **Orders**: filter by status; view items, customisation, proof status, totals, delivery address and history. Change status and tracking number, with optional customer emails for in production, shipped and cancelled. Record refunds (capped at the order total; Stripe refund ID checked). **Assign cards** by pasting card URLs or tokens, or take them from stock. Cards are activated straight away for account orders; guest buyers claim them with the printed code.
- **Proofs**: every customised line (logo, name or title) needs approval. The queue shows the logo (served only to admins), name and title. Approve, or ask for a change (a reason is required and is emailed to the customer). When all of an order's proofs are approved, it moves to "In production" and the customer is emailed.
- **Cards**: search by URL, token or owner email. Detail page with owner, destination, batch, order and assignment history. Disable, reactivate, reassign to another customer by email, or return to stock with a **new** claim code (shown once).
- **Products**: create and edit products and finishes (code, description, stock, on sale), and set prices per currency for the product and per finish. Blank means not sold in that currency.
- **Customers** (search and detail), **Enquiries** (inbox with status), and an **Audit log** showing who, what, when and before/after for every admin change.
- **`docs/nfc-programming.md`**: chip choice (NTAG215/216; on-metal inlays for steel), writing one NDEF URI record with NXP TagWriter, an iPhone/Android/QR verification checklist, locking, packaging, fulfilment and troubleshooting.
- Migration `0002`: proof files are optional, for text-only customisation.

### Tested

- `npm run lint`, `npm run typecheck`, `npm run build`: pass.
- Unit (73 in total): CSV formula-injection escaping; a check that **every** admin server action starts with `requireAdmin()`.
- Integration (44 in total, 17 new):
  - **every registered admin operation (29) rejects** signed-out visitors, customers, users with no role, and admins without two-step verification
  - a further check fails if a new admin function is exported without being registered, so it can't escape the authorization test
  - batches: codes exist only in the CSV and work for claiming; silly quantities rejected; regenerating codes kills the old ones; the QR zip has no codes
  - orders: account orders activate their cards; guest orders link without activating; claimed cards are refused
  - cards: disable, reassign and release (old code dead, new one works), each audited with before/after
  - refunds capped at the order total, and the status updates
  - proofs: production starts only when all are approved; rejections need a reason
  - price changes appear in the shop
- End-to-end (20 in total, 4 new):
  - signed-out → sign-in; a customer gets a **404 status** on all 10 admin pages and both admin file routes
  - admin must enrol two-step verification (real TOTP codes), then needs a code at sign-in; email links refused
  - full fulfilment:
    - create batch → CSV download (verified header and rows) → QR zip
    - customer buys 2 printed cards → admin approves the proof → "Your design is approved" email → order in production
    - assign 2 cards from stock → they appear in the customer's account
    - ship with tracking → email contains the tracking number
    - disable a card → it resolves to "not active"
    - all five actions appear in the audit log under the admin's email
  - an admin price change shows in the shop

### Simulated or untested

- Writing NFC chips is manual by design (see the doc). It hasn't been tried with physical cards.
- Refunds are recorded, not issued: money moves in the Stripe dashboard. The `charge.refunded` webhook isn't handled yet.
- Admin emails (proof decisions, shipping) go through the email boundary, so they're untested with Resend, as in earlier milestones.

### Known gaps and follow-ups

- No admin UI to remove an admin's role or reset another admin's two-step verification (use the database or extend the CLI). Backup codes are the self-service recovery route.
- Messages for admin forms that disappear after success (for example, an approved proof leaving the queue) aren't shown; the page itself shows the new state.

## Milestone 3: Storefront and checkout

### Built

- **Shop** (`/shop`, `/shop/{slug}`):
  - products with finishes and a card illustration that changes with the finish and shows your printed name and title live (labelled as an illustration)
  - quantity up to 50, with a link to team quotes above that
  - optional custom printing: name, title and a logo upload, which is validated, re-encoded to PNG and stripped of metadata; a proof is promised before printing
  - delivery estimates built from production time plus shipping times
- **Multi-currency**: GBP, EUR and USD with fixed prices from the database (option prices override the product price). The default currency comes from the browser language and can be changed with the header switcher, which is saved in a cookie. UK/EU prices are shown VAT-inclusive; US prices exclude sales tax. Products without a price in the current currency show as unavailable, not converted.
- **Basket** (`/cart`): stored in the database behind an httpOnly cookie and re-priced on every view. You can change quantities (with server-side limits) and remove items. The summary shows subtotal, every delivery option with its price and time, and the tax position. It says the full total appears before payment. No pre-ticked extras, no urgency messages.
- **Checkout**: a payments boundary (`src/server/payments/`) with a **Stripe Checkout** provider and a **simulated** provider for development (clearly labelled; refused in production). Starting checkout saves a snapshot of the basket.
- **Orders from verified webhooks only** (`/api/webhooks/stripe`):
  - signature verified against the raw body
  - each event recorded in the same transaction as its effects, so a replay changes nothing and a failure rolls back cleanly
  - one order per checkout session
  - amounts taken from Stripe, with a note on the order if Stripe's subtotal differs from the snapshot
  - delayed payment methods handled (pending → succeeded); expired or failed sessions keep the basket
  - on success: stock decremented, logo proofs queued and the order set to "Proof to approve", basket emptied, confirmation email sent through the email boundary
- **Success page**: only reports what the webhook recorded. It refreshes for up to about 40 seconds while waiting, and only reveals the order to the same account or basket that started the checkout.
- **Order history** (`/dashboard/orders`, `/dashboard/orders/{reference}`): status explained in plain language, items, printing details, proof status, totals, refunds and delivery address. Owner only.
- **Teams page** (`/teams`) with a quote request form: validated, rate-limited, protected by a hidden honeypot field, saved as an enquiry, and sends a notification email.
- **Header**: currency switcher, basket count, and a menu for small screens that works without JavaScript.
- New migration `0001_checkout_session`.

### Tested

- `npm run lint`, `npm run typecheck`, `npm run build`: pass.
- Unit: currency detection from browser language and money formatting (56 unit tests in total).
- Integration (27 in total, 14 new, against real Postgres):
  - prices in all three currencies; plain lines merge and customised lines don't; finish rules; items without a price in the currency can't be checked out
  - exactly the right line items, tax and shipping settings are sent to the provider
  - no order before the webhook; one order even when the same event or a new event for the same session arrives again
  - correct amounts, status and email on the order; proof queued; stock decremented; basket emptied
  - owner-only order access, and the success page hidden from strangers
  - subtotal mismatch flagged; delayed payment waits; expiry keeps the basket; events for unknown sessions ignored
  - **Stripe signatures** (made with Stripe's own test helper): valid events accepted and mapped; tampered bodies, missing signatures and wrong secrets rejected
  - the webhook route returns 400 for a bad signature without creating an order, and 200 creating the order for a good one
- End-to-end (16 in total, 5 new):
  - signed-in purchase: option price → live button total → basket → switch to EUR (€56) and back → simulated checkout with next-day delivery → confirmation page → email with the correct lines and totals → empty basket → order in the account → database row is PAID with total £58.95
  - guest purchase with a printed name ends in "Proof to approve", and the success link shows nothing to a stranger
  - cancelling checkout keeps the basket
  - quantity limit message
  - team enquiry validation, then saved
- Visual check by screenshot: shop, product (desktop and mobile), basket, mobile menu. No horizontal scrolling on a phone-sized screen.

### Simulated or untested

- **Real Stripe Checkout has not been run.** No Stripe keys exist yet, and this build environment can't reach Stripe. What is tested: the request built for Stripe (through a recording stand-in), webhook signature checks, event mapping, and order creation. What isn't tested: the live `checkout.sessions.create` call and Stripe's hosted page. Follow "Stripe test mode" in the README, then do one test purchase with card 4242.
- **Stripe Tax is off** (`STRIPE_TAX_ENABLED=false`) until tax registrations are set up.
- The end-to-end purchase tests use the **simulated provider**.
- Refund webhooks (`charge.refunded`) aren't handled yet; refunds are recorded by admins (Milestone 4).

### Known gaps and follow-ups

- Shipping rates, countries and production times are placeholder policy in `src/config/commerce.ts`.
- A guest basket isn't merged into the account when someone signs in after adding items. The basket stays with the browser either way.

## Milestone 2: Cards and profiles

### Built

- **Card links** (`/c/{token}`): every tap is a 307 redirect with `Cache-Control: no-store`. The states:
  - unclaimed → activation page
  - active → the owner's profile, or straight to their LinkedIn
  - active but profile unpublished → "not set up yet" page
  - deactivated, unknown or malformed → the same "not active" page, so nothing is revealed about which cards exist
- **Claiming** (`/activate/{token}`): sign in or sign up, then enter the claim code. Codes are case- and spacing-tolerant. Wrong codes, unknown cards and already-claimed cards all get the same message. Claims are rate-limited per user and per card. A conditional update means only one of two simultaneous claims can win, and every claim is recorded in the assignment history.
- **Profile editor**: name, job title, company, bio, photo, LinkedIn, work email, business phone, website, a public/hidden switch for each optional field, a changeable address (`/p/{slug}`), opt-in search-engine indexing, and publish/unpublish (publishing requires a verified email). The page explains plainly that shown details are visible to anyone with the card or link.
- **Validation** (Zod, server-side): links must be http(s), so `javascript:`, `data:` and URLs containing credentials are rejected. LinkedIn must be `https` on `linkedin.com` or a subdomain; look-alike domains are rejected and tracking parameters stripped. Bare domains get `https://`. Phone, email and slug rules give specific error messages, and what the user typed is kept when validation fails.
- **Photos**: checked by content, not filename (JPEG, PNG or WebP, up to 5 MB), then re-encoded to a 512px WebP. This removes EXIF, GPS and camera data. Photos are served through `/media/…` with the profile's rules: public only when the profile is published and the photo is shown, otherwise only to the owner.
- **Public profile** (`/p/{slug}`): server-rendered, with only the fields the owner made public. It has Connect on LinkedIn (a plain https link with `noopener noreferrer`), Save contact, a Share button (native share sheet, falling back to copying the link) and an on-screen QR code. It's `noindex` unless the owner opts in. Unknown or unpublished profiles return a real 404, handled in the proxy because a streamed page can't change its status.
- **vCard**: built server-side from public fields only, with RFC escaping (values can't inject extra fields), stripping of control characters, line folding, a safe filename, and the photo if it's public.
- **Preview**: uses the same filtering function and component as the public page, so it shows exactly what visitors see, even before the profile is published.
- **Cards dashboard**: rename, choose profile or LinkedIn, download QR as SVG or PNG (owner only), and deactivate (with a confirmation that explains the chip isn't erased) or reactivate.
- **Account settings**: change name, change email (approved from the old address, then verified at the new one), change password (signs out other sessions), download my data (JSON with no secrets), and delete account. Deletion requires the password and typing DELETE. It removes the profile and photo, deactivates and detaches the cards, and keeps orders without the user link.
- **Integration boundaries**:
  - rate limiter: in-memory for development, Upstash REST for production
  - object storage: local disk for development, S3/R2 for production
- The data-access layer (`src/server/profiles.ts`, `src/server/cards/`) scopes every read and write to the signed-in user.

### Tested

- `npm run lint`, `npm run typecheck`, `npm run build`: pass.
- Unit (Vitest, 47 tests): URL safety (`javascript:`, `data:`, credentials, look-alike LinkedIn domains), profile validation, slug generation, vCard escaping/folding/filenames, rate limiter windows, plus the Milestone 1 tests.
- Integration (Vitest against a real Postgres database, 13 tests):
  - another user cannot read, rename, redirect, deactivate or reactivate someone else's card
  - another user cannot claim an already-claimed card, even with its code
  - profile edits only touch the acting user's profile, and nobody can take another user's address
  - wrong codes, unknown tokens and malformed tokens give the same message, and two simultaneous claims produce one winner
  - every card state resolves correctly; unknown tokens look like deactivated ones
  - public profiles never include hidden fields or internal IDs, unpublished profiles stay hidden, and publishing needs a verified email
- End-to-end (Playwright, 11 tests in all, 5 new):
  - full journey:
    - tap a new card → activate (wrong code, then right code typed loosely)
    - "not set up yet" → fill in the profile → upload a photo with GPS EXIF → unpublished profile returns 404 → publish
    - tap opens the profile → LinkedIn link correct and `noopener` → hidden phone absent from the HTML → served photo has no EXIF and is 512px → vCard has only public fields
    - redirect is 307 + `no-store` → switch to LinkedIn → deactivate → "not active" → reactivate → QR download
  - a second user gets 404 on the first user's card QR and private photo, sees "can't be activated" for their card, and has no cards; anonymous visitors can't load the private photo
  - non-image uploads are rejected
  - `javascript:` websites and look-alike LinkedIn domains are rejected, and the typed values are kept
  - data export contains no secrets, and after account deletion the user is gone and their card resolves to "not active"
- Visual check by screenshot: public profile (mobile), profile editor, cards page.

### Simulated or untested

- **S3/R2 storage: untested.** It needs the `S3_*` variables and a private bucket.
- **Upstash rate limiter: untested.** It needs `UPSTASH_REDIS_REST_*`. Without them the in-memory limiter is used, which isn't shared between server instances.
- Email change is wired to Better Auth but not covered by an e2e test yet.

### Known gaps and follow-ups

- One profile per user. The schema could support more later.
- Changing your profile address breaks old `/p/` links (cards are unaffected). Redirecting old addresses is a possible follow-up.
- Rate-limit client keys trust the first `X-Forwarded-For` hop, which is correct behind Vercel. Check this on other hosts.

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
- Production rate limiting uses Better Auth's database store for auth endpoints (app endpoints: see Milestone 2).
- The two-factor sign-in step is built but not yet exercised by tests; enrolment and admin MFA enforcement are Milestone 4.

### Known gaps and follow-ups

- The CSP allows `'unsafe-inline'` scripts because Next's bootstrap scripts are inline and nonces would make every page dynamic. Revisit with Next's experimental SRI support before launch.

## Future work (out of scope for this build)

- Team/organisation accounts (company admin manages staff profiles and reassigns cards when people leave). The schema already reserves `organisationId`.
- CRM integrations (HubSpot, Salesforce) and lead capture from profile visitors.
- Apple/Google Wallet passes.
