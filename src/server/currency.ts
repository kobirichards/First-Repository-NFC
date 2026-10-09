import "server-only";
import { cookies, headers } from "next/headers";
import { type Currency, currencyFromAcceptLanguage, isCurrency } from "@/config/commerce";

export const CURRENCY_COOKIE = "currency";

/** The visitor's currency: their explicit choice, else a guess from their browser language. */
export async function getCurrency(): Promise<Currency> {
  const chosen = (await cookies()).get(CURRENCY_COOKIE)?.value;
  if (isCurrency(chosen)) return chosen;
  return currencyFromAcceptLanguage((await headers()).get("accept-language"));
}
