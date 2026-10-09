# Status

_Last updated: Milestone 3 complete._

| Milestone | State |
|---|---|
| 1. Foundation | ✅ Done |
| 2. Cards and profiles | ✅ Done |
| 3. Storefront and checkout | ✅ Done (real Stripe untested: no keys yet) |
| 4. Admin and fulfilment | Not started |
| 5. Polish and launch prep | Not started |

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
- Logo uploads are kept even if the person never checks out. They need a cleanup job (Milestone 5).

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
- Optional tap/view analytics is not implemented (Milestone 5).

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

- Footer links to info pages that arrive in Milestone 5.
- The CSP allows `'unsafe-inline'` scripts because Next's bootstrap scripts are inline and nonces would make every page dynamic. Revisit with Next's experimental SRI support before launch.

## Future work (out of scope for this build)

- Team/organisation accounts (company admin manages staff profiles and reassigns cards when people leave). The schema already reserves `organisationId`.
- CRM integrations (HubSpot, Salesforce) and lead capture from profile visitors.
- Apple/Google Wallet passes.
