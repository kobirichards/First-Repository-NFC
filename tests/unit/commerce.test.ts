import { describe, expect, it } from "vitest";
import { currencyFromAcceptLanguage, formatMoney } from "@/config/commerce";

describe("currencyFromAcceptLanguage", () => {
  it.each([
    ["en-GB,en;q=0.9", "GBP"],
    ["en-US,en;q=0.9", "USD"],
    ["fr-FR,fr;q=0.9", "EUR"],
    ["de", "EUR"],
    ["en-IE", "EUR"],
    ["ja-JP", "GBP"],
    ["", "GBP"],
    [null, "GBP"],
  ])("%s → %s", (header, expected) => expect(currencyFromAcceptLanguage(header)).toBe(expected));
});

describe("formatMoney", () => {
  it("formats minor units", () => {
    expect(formatMoney(2400, "GBP")).toBe("£24");
    expect(formatMoney(2450, "GBP")).toBe("£24.50");
    expect(formatMoney(2900, "USD")).toBe("$29");
    expect(formatMoney(2800, "EUR")).toBe("€28");
  });
});
