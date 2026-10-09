import Link from "next/link";
import { CurrencySwitcher } from "@/components/shop/currency-switcher";
import { getCartView } from "@/server/cart";
import { readCartId } from "@/server/cart-cookie";
import { getCurrency } from "@/server/currency";

/** Reads cookies, so it renders inside <Suspense>. */
export async function ShopControls() {
  const currency = await getCurrency();
  const cartId = await readCartId();
  const cart = cartId ? await getCartView(cartId, currency) : null;
  const count = cart?.itemCount ?? 0;
  return (
    <div className="flex items-center gap-3">
      <CurrencySwitcher key={currency} current={currency} />
      <Link href="/cart" className="text-sm font-semibold text-ink hover:text-bottle">
        Basket{count ? <span className="ml-1 rounded-full bg-bottle px-2 py-0.5 text-xs text-white">{count}</span> : null}
        <span className="sr-only">{count ? ` (${count} ${count === 1 ? "item" : "items"})` : " (empty)"}</span>
      </Link>
    </div>
  );
}
