# Launch checklist

The app has technical safeguards (see STATUS.md), but **safeguards are not compliance**. This list covers the decisions, registrations and reviews the business must complete for the regions it sells in. None of it is legal or tax advice: get each item reviewed by a qualified professional.

Tick each item and note who confirmed it and when.

## 1. Business and brand

- [ ] Legal entity formed; registered name, number and address added to `src/config/brand.ts` (`legalEntity`) and the About, Privacy and Terms pages.
- [ ] **Trademark search** on the final brand name in the UK (UKIPO), EU (EUIPO) and US (USPTO) for business cards / NFC goods and software services (Nice classes 9, 16, 35, 42). "Tessera" is a placeholder and is used by other companies.
- [ ] Brand name replaced in `src/config/brand.ts`, plus `EMAIL_FROM` and the support email.
- [ ] **`CARD_DOMAIN` registered for the long term** (multi-year, auto-renew, registrar lock, two people with access). Every card ever sold depends on it.

## 2. Privacy (UK GDPR / EU GDPR / US state laws)

- [ ] Privacy policy reviewed and the bracketed placeholders completed: controller details, processors and their locations, international transfers and safeguards, retention periods, lawful bases.
- [ ] Data processing agreements in place with every processor: hosting, database, file storage, email provider, Stripe, and the card printer (who receives claim codes and printed names and logos).
- [ ] Record of processing activities written (UK GDPR Art. 30).
- [ ] Registered with the ICO and the data protection fee paid (UK), unless exempt.
- [ ] Decide whether a DPIA is needed: public profiles of individuals, and optional analytics.
- [ ] Decide whether an EU representative is needed (Art. 27), if selling to the EU without an EU establishment.
- [ ] US: check obligations under state privacy laws (e.g. California CCPA/CPRA thresholds). Add a "Do not sell or share" statement if relevant (the app doesn't sell data).
- [ ] Process for handling data subject requests that self-service doesn't cover (access by email, objection, restriction), with a response deadline.
- [ ] Breach response plan: who decides, and the 72-hour ICO notification route.
- [ ] Confirm the hosting provider's server-log retention and include it in the privacy policy.
- [ ] Decide whether `ANALYTICS_ENABLED` is turned on, and make sure the privacy policy wording matches (the page adapts automatically).

## 3. Cookies (UK PECR / EU ePrivacy)

- [ ] Confirm all cookies are strictly necessary (session, two-step sign-in, basket, currency), so no consent banner is needed. The cookie policy lists them.
- [ ] If any analytics, advertising or chat tool is added later, a consent mechanism is needed **before** it sets anything.

## 4. Tax

- [ ] **UK VAT**: register when over the threshold (or voluntarily). Confirm VAT-inclusive pricing and invoice requirements.
- [ ] **EU VAT**: decide on OSS (One-Stop Shop) registration for distance sales to EU consumers. Check import VAT/IOSS if shipping from outside the EU, and customs paperwork for UK → EU shipments.
- [ ] **US sales tax**: check economic nexus per state; register where required.
- [ ] Configure registrations in Stripe Tax, then set `STRIPE_TAX_ENABLED=true` and do a test purchase per region.
- [ ] Prices in `Admin → Products` set for each currency (seed values are placeholders), VAT-inclusive for GBP/EUR.

## 5. Consumer rights

- [ ] **14-day cancellation (UK Consumer Contracts Regulations / EU Consumer Rights Directive)**: confirm that personalised (printed) cards are exempt once made, and that plain cards can be returned. Check the cancellation wording on the Shipping and returns page and in the order confirmation email.
- [ ] Pre-contract information shown before payment: identity, total price including taxes and delivery, delivery times, cancellation rights. Check the Stripe Checkout page shows the business name and terms link.
- [ ] Terms of sale completed by a professional. The current page is an outline with placeholders, including liability, governing law, and **what happens to cards if the service closes**.
- [ ] Complaints handling process; online dispute resolution wording if required.
- [ ] Shipping rates, countries and production times in `src/config/commerce.ts` match what the business can actually deliver.

## 6. Product safety and labelling

- [ ] UK/EU general product safety: responsible person/importer details, traceability (batch IDs exist in the system), and labelling on packaging.
- [ ] Radio equipment: confirm passive NFC tags need no further marking. Get the supplier's declarations (e.g. RoHS/REACH for PVC and inlays).
- [ ] Packaging and WEEE/packaging waste obligations, if they apply at your volumes.
- [ ] Recycled PVC claim ("Recycled white"): only keep it if the supplier can back it up.

## 7. Accessibility

- [ ] Automated checks pass (axe, WCAG 2.2 A/AA, on 23 pages at desktop and phone size).
- [ ] A manual check with a screen reader (VoiceOver on iPhone and NVDA on Windows) on: buying a card, editing a profile, the public profile.
- [ ] Accessibility statement published, if wanted.

## 8. Security and operations

- [ ] Production secrets generated fresh (`BETTER_AUTH_SECRET`, `CLAIM_CODE_SECRET`), stored in the host's secret manager, and **never** reused from development.
- [ ] `APP_ENV=production`, `EMAIL_PROVIDER=resend` with a verified sending domain (SPF, DKIM, DMARC), `STORAGE_PROVIDER=s3` with a private bucket, and Upstash Redis for rate limiting.
- [ ] Stripe live keys, and the webhook endpoint registered for the four events in the README. Do one real purchase and refund.
- [ ] First admin created with `npm run admin:create`. Two-step verification enrolled. Backup codes stored safely. At least two admins, so one losing a phone isn't a lockout.
- [ ] Database backups enabled, with point-in-time recovery, and a restore tested.
- [ ] `npm run cleanup` scheduled daily.
- [ ] Error monitoring and uptime checks on `/`, `/c/{a test card}` and the webhook endpoint.
- [ ] Dependency audit (`npm audit`) reviewed. Consider an external penetration test before scale.
- [ ] Look into moving the CSP from `'unsafe-inline'` to nonces/SRI (see STATUS.md).

## 9. Cards and fulfilment

- [ ] Printer agreement, including how they handle claim-code CSVs (deleted after printing).
- [ ] Test batch printed, chips written and locked, and checked on iPhone and Android per `docs/nfc-programming.md`.
- [ ] Metal cards: confirm the on-metal inlay reads reliably before selling the Metal card.
- [ ] Support process for lost cards, faulty chips and reassignment requests.
