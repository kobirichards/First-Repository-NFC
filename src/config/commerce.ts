/**
 * Commerce settings. Prices themselves live in the database (admin-editable);
 * everything here is policy. PLACEHOLDER values: review before launch.
 */
export const CURRENCIES = ["GBP", "EUR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "GBP";

export const currencyInfo: Record<Currency, { label: string; locale: string; taxNote: string; taxInclusive: boolean }> = {
  GBP: { label: "£ GBP", locale: "en-GB", taxInclusive: true, taxNote: "Prices include VAT." },
  EUR: { label: "€ EUR", locale: "en-IE", taxInclusive: true, taxNote: "Prices include VAT." },
  USD: { label: "$ USD", locale: "en-US", taxInclusive: false, taxNote: "Sales tax, if any, is calculated at checkout." },
};

/** Countries we ship to, per checkout currency (ISO 3166-1 alpha-2). */
export const shippingCountries: Record<Currency, string[]> = {
  GBP: ["GB"],
  EUR: ["IE", "FR", "DE", "ES", "IT", "NL", "BE", "PT", "AT", "LU", "FI", "DK", "SE"],
  USD: ["US"],
};

export type ShippingRate = { id: string; name: string; amount: number; minDays: number; maxDays: number };

/** Flat-rate shipping options per currency, in minor units. */
export const shippingRates: Record<Currency, ShippingRate[]> = {
  GBP: [
    { id: "standard", name: "Royal Mail tracked", amount: 0, minDays: 3, maxDays: 5 },
    { id: "express", name: "Next working day", amount: 695, minDays: 1, maxDays: 2 },
  ],
  EUR: [{ id: "standard", name: "Tracked delivery", amount: 795, minDays: 5, maxDays: 9 }],
  USD: [{ id: "standard", name: "Tracked delivery", amount: 995, minDays: 6, maxDays: 10 }],
};

/** Production time before dispatch, shown on product pages. */
export const productionDays = { plain: { min: 1, max: 2 }, customised: { min: 3, max: 5 } };

/** Above this many cards in one line, we point people to the teams page. */
export const MAX_QUANTITY_PER_LINE = 50;

/**
 * Stripe Tax: set STRIPE_TAX_ENABLED=true once tax registrations are configured
 * in the Stripe dashboard. Until then, Checkout collects no tax and UK/EU
 * prices are treated as already including VAT.
 */
export const stripeTaxEnabled = () => process.env.STRIPE_TAX_ENABLED === "true";

/** Picks a currency from an Accept-Language header. */
export function currencyFromAcceptLanguage(header: string | null | undefined): Currency {
  if (!header) return DEFAULT_CURRENCY;
  const tags = header
    .split(",")
    .map((part) => part.split(";")[0].trim().toLowerCase())
    .filter(Boolean);
  for (const tag of tags) {
    const [lang, region] = tag.split("-");
    if (region === "gb" || region === "uk") return "GBP";
    if (region === "us") return "USD";
    if (region && ["ie", "fr", "de", "es", "it", "nl", "be", "pt", "at", "lu", "fi", "dk", "se"].includes(region)) return "EUR";
    if (!region && ["fr", "de", "es", "it", "nl", "pt", "fi", "sv", "da"].includes(lang)) return "EUR";
  }
  return DEFAULT_CURRENCY;
}

export function isCurrency(value: unknown): value is Currency {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

export function formatMoney(amount: number, currency: Currency): string {
  const fractionDigits = amount % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat(currencyInfo[currency].locale, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}
