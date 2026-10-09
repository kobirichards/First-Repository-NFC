# Status

_Last updated: Milestone 2 complete._

| Milestone | State |
|---|---|
| 1. Foundation | ✅ Done |
| 2. Cards and profiles | ✅ Done |
| 3. Storefront and checkout | Not started |
| 4. Admin and fulfilment | Not started |
| 5. Polish and launch prep | Not started |

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

- Header and footer link to pages that don't exist yet (shop, teams, info pages); they arrive in Milestones 3 and 5.
- The dashboard's Orders section arrives in Milestone 3.
- The CSP allows `'unsafe-inline'` scripts because Next's bootstrap scripts are inline and nonces would make every page dynamic. Revisit with Next's experimental SRI support before launch.

## Future work (out of scope for this build)

- Team/organisation accounts (company admin manages staff profiles and reassigns cards when people leave). The schema already reserves `organisationId`.
- CRM integrations (HubSpot, Salesforce) and lead capture from profile visitors.
- Apple/Google Wallet passes.
