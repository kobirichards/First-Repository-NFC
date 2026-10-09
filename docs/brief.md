# Build brief: NFC business cards for professionals

You are a senior full-stack engineer, product designer, security-minded architect and QA engineer. Build a website and web application for a business that sells NFC-enabled business cards to corporate professionals, especially people at conferences, trade shows and networking events.

**Core product:** a customer buys a physical NFC card. Tapping it with a phone opens a web page controlled by the cardholder: either their hosted digital profile or, if they choose, their LinkedIn profile directly. The owner can change where the card goes, and what the profile shows, at any time without replacing the card. The chip stores only a stable URL on this service, never personal data. Every card also has a QR code that leads to the same URL, for phones that can't or don't use NFC.

---

## 0. How to work

1. Inspect the repository and follow any existing conventions. If it is empty, use the stack in section 1.
2. Before writing code, write `PLAN.md` with: architecture, data model, assumptions, and the milestones in section 9 with their acceptance criteria. Then start Milestone 1. Do not wait for approval unless a decision is irreversible or contradicts this brief.
3. Work milestone by milestone. At the end of each one: run lint, type check, migrations and tests; fix failures; commit with a clear message; push to the GitHub remote if one is configured; update `STATUS.md`. Stop after each milestone and summarise what was built, what was tested, and what is next.
4. Where credentials or third-party accounts are missing, build a clear integration boundary (an interface plus a local/dev implementation) and say so. Never describe a simulated or untested integration (payments, email, shipping, NFC writing) as working.
5. Make reasonable assumptions where details are missing and list them in `PLAN.md`. Keep brand name, prices, currencies, shipping regions, tax settings and product options in configuration or the database, never scattered through the code.

## 1. Stack (use unless the repo already dictates otherwise)

- **App:** Next.js (App Router) + TypeScript, strict mode. Tailwind CSS with accessible primitives (e.g. Radix / shadcn/ui).
- **Database:** PostgreSQL via Prisma (or Drizzle), with migrations and a seed script. Local Postgres via Docker Compose.
- **Auth:** Auth.js (or Better Auth) with email + password and email magic link; secure, httpOnly, SameSite cookies. Email verification required before a profile can be made public.
- **Payments:** Stripe Checkout (hosted) in test mode, plus webhooks for order state. Never handle or log card data.
- **Email:** Resend (or similar) behind an interface; in development, log emails to the console or a local mail catcher.
- **File storage:** S3-compatible storage (e.g. Cloudflare R2 or Vercel Blob) behind an interface; local disk in development.
- **Validation:** Zod schemas shared by client and server; the server is the source of truth.
- **Testing:** Vitest for unit/integration, Playwright for end-to-end flows.
- **Deployment target:** Vercel (or similar) + managed Postgres (e.g. Neon). Document it; don't deploy.

## 2. The card URL model (get this right first; everything depends on it)

- Each physical card has a **card token**: a random, unguessable identifier (at least 96 bits of randomness, URL-safe, not sequential), encoded as `https://{DOMAIN}/c/{token}`. This exact URL is written to the chip and encoded in the QR code. It must never change.
- The card token is separate from the profile. A profile has its own public slug (`/p/{slug}`), which the owner can change. Cards point to profiles through an assignment record, so a card can be reassigned without rewriting it.
- `/c/{token}` resolves on every request:
  - **Unassigned/unclaimed card** → an "Activate this card" page (see claiming below).
  - **Active card** → the owner's chosen destination: their hosted profile (default) or their LinkedIn URL directly.
  - **Deactivated card** → a neutral "This card is no longer active" page that reveals nothing about the previous owner.
- Use **temporary redirects (302/307) with `Cache-Control: no-store`**, never 301/308, because permanent redirects are cached by browsers and would stop updates from taking effect.
- **Claiming:** each card ships with a short claim code printed in its packaging. A buyer can link a card to their account either automatically (cards assigned to their order at fulfilment) or by tapping an unclaimed card, signing in, and entering the claim code. Rate-limit claim attempts.
- The domain written to cards must be treated as permanent. Note in the docs that letting it lapse breaks every card ever sold.

## 3. Public storefront

- **Home:** clear value proposition, "How it works" (buy → set up profile → tap), use cases for events and teams, product highlights, FAQs, prominent calls to action. Testimonial sections must be visibly labelled placeholders; no invented reviews, logos or statistics.
- **Product page:** card materials/finishes, optional custom printing (name, title, company logo upload with a proof-approval step before production), quantity, live price in the selected currency, delivery-estimate messaging, add to cart.
- **Multi-currency:** support GBP, EUR and USD from launch using fixed per-currency prices (not live FX conversion). Default currency from the visitor's locale, with a visible switcher. Show prices tax-inclusive where that is the local norm (UK/EU) and keep tax handling configurable (Stripe Tax is the expected route).
- **Cart and checkout:** persistent cart; Stripe Checkout in test mode; order created from the verified webhook, not from the redirect. Clear total, shipping and tax before payment. No pre-ticked add-ons or fake urgency.
- **Teams page:** bulk/corporate enquiry form (company, contact, quantity, timeline, message) that creates an enquiry record and sends a notification.
- **Info pages:** About, Contact, Shipping & returns, Privacy, Terms, Cookies. Legal pages are drafts with a visible banner: "Draft — requires review by a qualified professional before launch."
- **SEO/metadata:** titles, descriptions, Open Graph tags, sitemap, robots.txt. Public profiles default to `noindex`; the owner can opt in to indexing.
- Proper empty, loading, error and success states throughout.

## 4. Customer dashboard

A signed-in customer can:
- Register, sign in/out, verify email, reset password, change email/password, and **delete their account and export their data**.
- View orders and their status, and the cards linked to their account.
- Create and edit a profile: name, job title, company, photo, short bio, email, optional business phone, website, LinkedIn URL. Each optional field has a public/hidden toggle; only name is required to be public. Explain plainly that public details are visible to anyone with the link or card.
- Choose each card's tap destination: hosted profile or LinkedIn directly.
- Preview the profile exactly as a visitor sees it.
- Download each card's QR code (SVG and PNG).
- Deactivate and reactivate a card (e.g. if lost), with a plain explanation that deactivation stops the card working but doesn't erase the chip.
- See basic tap/visit counts per card, if analytics are enabled (see section 7).

Rules: never ask for LinkedIn passwords, never scrape LinkedIn, never imply affiliation with LinkedIn. LinkedIn is a user-supplied external link, validated to be an `https://` URL on `linkedin.com`.

## 5. Public profile page

- Mobile-first and fast: server-rendered, minimal JavaScript, optimised images. Target a Lighthouse mobile performance score of 90+.
- Shows name, role, company, photo and only the fields the owner made public.
- Prominent "Connect on LinkedIn" button; works whether or not the LinkedIn app is installed (plain https link).
- "Save contact" vCard download built server-side from public fields only, with proper escaping.
- Share button (Web Share API with copy-link fallback) and a QR code for showing on screen.
- All external links: `https:`/`http:` only (reject `javascript:`, `data:` and others), `rel="noopener noreferrer"`.
- No dashboard data, email-verification status, or internal IDs exposed.

## 6. Admin and fulfilment

Admin area protected by server-side role checks on every route and server action (hiding UI is not enough). Admin accounts require MFA. The first admin is created via a documented CLI/seed command, not a public sign-up.

Admins can:
- Manage products, options, prices per currency, inventory, orders and order status, refunds (recorded; actual refunds issued through Stripe), customers, and corporate enquiries.
- **Generate card batches:** create N card tokens with claim codes and export a CSV (token, full URL, claim code, QR filename) for the printer/supplier, plus a zip of QR codes.
- Assign cards to orders, assign or reassign a card to a customer/profile, and disable a card.
- Approve or reject custom-print artwork proofs.
- View an audit log of every admin action (who, what, when, before/after).

**NFC programming:** no automated tag writing. Document the manual process in `docs/nfc-programming.md`: recommended chip (NTAG215/216), writing a single NDEF URI record with the card URL using an app such as NXP TagWriter, verifying by tapping on both iPhone and Android, and locking the tag after verification (safe because the URL never changes). Include a test checklist.

## 7. Analytics (optional, off by default)

If implemented: count taps/visits per card and profile, aggregated by day. Do not store IP addresses, full user agents, or any visitor identifiers, and set no cookies on public profile pages. Make it a config flag and describe it in the privacy policy draft.

## 8. Security, privacy and accessibility

- Ownership checks on every customer-specific read and write, enforced server-side and covered by tests.
- Server-side validation and normalisation of all input; output encoding; parameterised queries via the ORM.
- CSRF protection for state-changing requests; secure headers including a Content Security Policy, HSTS, `X-Content-Type-Options`, `Referrer-Policy` and frame restrictions.
- Rate limiting on sign-in, sign-up, password reset, claim codes, contact/enquiry forms and the public `/c/` and `/p/` endpoints (an Upstash-style limiter in production, in-memory in development).
- Uploads: validate type and size, re-encode images, and **strip EXIF metadata** (it can contain GPS location).
- Generic error messages to users; detailed errors only in server logs, with no secrets or personal data logged.
- Secrets only in environment variables; provide `.env.example` with placeholders.
- Accessibility to WCAG 2.2 AA: semantic HTML, keyboard navigation, visible focus, sufficient contrast, labelled form fields, helpful error messages, accessible dialogs. Run automated checks (axe via Playwright) on key pages.
- No claims of GDPR or other legal compliance. Provide `docs/launch-checklist.md` covering: UK GDPR/EU GDPR and US state privacy questions, cookie consent, VAT/sales tax registration and collection per region, consumer rights (UK/EU 14-day cancellation and how it applies to personalised cards), returns, product safety, trademark check on the brand name, and terms of service.

## 9. Milestones and acceptance criteria

1. **Foundation.** Project setup, Docker Postgres, schema + migrations + seed, auth with email verification, base layout and design system. *Done when:* a user can sign up, verify, sign in and out; tests pass.
2. **Cards and profiles.** Profile editor with visibility toggles, photo upload, public profile page, vCard, QR codes, `/c/{token}` resolution with all states, claiming, destination choice, deactivation. *Done when:* tests prove a user cannot read or modify another user's profile or cards, and every card state resolves correctly.
3. **Storefront and checkout.** Product pages, multi-currency pricing, cart, Stripe Checkout (test mode), webhook-driven orders, order history, confirmation email via the email interface. *Done when:* a Playwright test completes a test purchase end to end with Stripe test keys, or the boundary is clearly marked untested if keys are absent.
4. **Admin and fulfilment.** Roles, MFA, product/order/customer management, card batch generation and CSV export, assignment, artwork proofs, audit log, enquiry inbox. *Done when:* tests prove non-admins are rejected by every admin route and action.
5. **Polish and launch prep.** Remaining content pages, SEO, accessibility pass, performance pass, optional analytics, full documentation. *Done when:* all checks pass and the docs below exist.

## 10. Brand and design

Invent an original placeholder brand name and keep it in a single config value so it can be swapped later. Visual direction: premium, modern and restrained, credible to a corporate buyer, not a generic template. Clean layout, strong typography and hierarchy, limited colour palette, excellent mobile usability. Product images may be clearly labelled placeholders or simple rendered card mockups.

## 11. Deliverables

- Working application with migrations, seed/demo data (including a demo customer, a demo admin, and cards in each state).
- `README.md`: setup, environment variables, database initialisation, running locally, test commands, Stripe test-mode setup (including the webhook CLI), deployment notes.
- `PLAN.md`, `STATUS.md`, `docs/nfc-programming.md`, `docs/launch-checklist.md`.
- Final report: what was built, what was tested and how, what is simulated or incomplete, and every external account, credential, legal review or operational task needed before launch. Nothing simulated is described as production-ready.

## 12. Out of scope for this build (note in STATUS.md as future work)

- Team/organisation accounts where a company admin manages employee profiles and reassigns cards when staff leave. Design the data model so this can be added without migration pain (e.g. a nullable `organisationId` on profiles and cards).
- CRM integrations (HubSpot, Salesforce) and lead capture from profile visitors.
- Apple/Google Wallet passes.
