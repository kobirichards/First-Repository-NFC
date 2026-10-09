import type { Metadata } from "next";
import { Suspense } from "react";
import { CartLineControls } from "@/components/shop/cart-line";
import { CheckoutButton } from "@/components/shop/checkout-button";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Notice } from "@/components/ui/notice";
import { currencyInfo, formatMoney, shippingRates } from "@/config/commerce";
import { getCartView } from "@/server/cart";
import { readCartId } from "@/server/cart-cookie";
import { getCurrency } from "@/server/currency";
import { paymentsProviderName } from "@/server/payments";
import { getSessionUser } from "@/server/session";
import { Loading } from "@/components/ui/loading";

export const metadata: Metadata = { title: "Basket", robots: { index: false } };

async function Cart({ searchParams }: { searchParams: PageProps<"/cart">["searchParams"] }) {
  const [currency, cartId, params, user] = await Promise.all([getCurrency(), readCartId(), searchParams, getSessionUser()]);
  const cart = cartId ? await getCartView(cartId, currency) : null;

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="rounded-card border border-stone bg-sheet p-8">
        <h2 className="text-lg font-semibold">Your basket is empty</h2>
        <p className="mt-2 text-moss">Choose a card to get started.</p>
        <ButtonLink href="/shop" className="mt-6">
          Browse cards
        </ButtonLink>
      </div>
    );
  }

  const rates = shippingRates[currency];
  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
      <div>
        {params.cancelled === "1" ? (
          <Notice className="mb-6">Checkout cancelled. You haven&apos;t been charged, and your basket is as you left it.</Notice>
        ) : null}
        <ul className="divide-y divide-stone border-y border-stone">
          {cart.lines.map((l) => (
            <CartLineControls
              key={`${l.id}-${l.quantity}`}
              line={{
                id: l.id,
                productSlug: l.productSlug,
                productName: l.productName,
                optionName: l.optionName,
                quantity: l.quantity,
                details: [
                  l.customisation?.printName ? `Printed name: ${l.customisation.printName}` : null,
                  l.customisation?.printTitle ? `Printed title: ${l.customisation.printTitle}` : null,
                  l.customisation?.artworkKey ? "Logo uploaded: we'll send a proof" : null,
                ].filter((d): d is string => Boolean(d)),
                unitLabel: l.unitAmount === null ? null : formatMoney(l.unitAmount, currency),
                totalLabel: l.lineTotal === null ? null : formatMoney(l.lineTotal, currency),
                problem:
                  l.unitAmount === null
                    ? `Not available in ${currency}. Remove it or switch currency.`
                    : !l.available
                      ? "Not enough stock for this quantity."
                      : null,
              }}
            />
          ))}
        </ul>
      </div>

      <aside aria-labelledby="summary" className="h-fit rounded-card border border-stone bg-sheet p-6">
        <h2 id="summary" className="text-lg font-semibold">
          Summary
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal ({cart.itemCount} {cart.itemCount === 1 ? "card" : "cards"})</dt>
            <dd className="font-semibold">{formatMoney(cart.subtotal, currency)}</dd>
          </div>
          <div>
            <dt>Delivery, chosen at checkout</dt>
            <dd className="mt-1 space-y-0.5 text-moss">
              {rates.map((r) => (
                <p key={r.id}>
                  {r.name}: {r.amount === 0 ? "free" : formatMoney(r.amount, currency)} ({r.minDays}–{r.maxDays} working days)
                </p>
              ))}
            </dd>
          </div>
          <div>
            <dt>Tax</dt>
            <dd className="mt-1 text-moss">{currencyInfo[currency].taxNote}</dd>
          </div>
        </dl>
        <p className="mt-5 border-t border-stone pt-4 text-sm text-moss">
          You&apos;ll see the full total, including delivery{currencyInfo[currency].taxInclusive ? "" : " and any tax"}, before you pay.
        </p>
        <div className="mt-5">
          <CheckoutButton disabled={!cart.purchasable} />
        </div>
        {!user ? (
          <p className="mt-4 text-sm text-moss">
            <a href="/sign-in?next=%2Fcart" className="font-semibold text-bottle underline-offset-4 hover:underline">
              Sign in
            </a>{" "}
            first to see this order in your account. You can also check out as a guest.
          </p>
        ) : null}
        <p className="mt-4 text-xs text-moss">
          {paymentsProviderName() === "stripe"
            ? "Payment is handled by Stripe. We never see your card details."
            : "Development mode: checkout is simulated and no payment is taken."}
        </p>
      </aside>
    </div>
  );
}

export default function CartPage(props: PageProps<"/cart">) {
  return (
    <Container className="py-12">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">Basket</h1>
      <Suspense fallback={<Loading label="Loading your basket" />}>
        <Cart searchParams={props.searchParams} />
      </Suspense>
    </Container>
  );
}
