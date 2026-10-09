"use client";

import { useRef } from "react";
import { setCurrencyAction } from "@/actions/shop";
import { CURRENCIES, type Currency, currencyInfo } from "@/config/commerce";

export function CurrencySwitcher({ current }: { current: Currency }) {
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={setCurrencyAction} className="flex items-center">
      <label htmlFor="currency" className="sr-only">
        Currency
      </label>
      <select
        id="currency"
        name="currency"
        defaultValue={current}
        onChange={() => form.current?.requestSubmit()}
        className="h-9 rounded-control border border-ink/15 bg-transparent px-2 text-sm font-medium"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {currencyInfo[c].label}
          </option>
        ))}
      </select>
      <button type="submit" className="sr-only">
        Change currency
      </button>
    </form>
  );
}
