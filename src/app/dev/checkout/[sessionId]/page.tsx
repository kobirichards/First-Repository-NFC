import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SimulatedCheckoutForm } from "@/components/shop/simulated-checkout-form";
import { Notice } from "@/components/ui/notice";
import { formatMoney, shippingCountries, shippingRates } from "@/config/commerce";
import { db } from "@/db";
import { checkoutSession } from "@/db/schema";
import { simulatedPaymentsEnabled } from "@/server/payments";
import { getSessionUser } from "@/server/session";
import { Loading } from "@/components/ui/loading";

export const metadata: Metadata = { title: "Simulated checkout", robots: { index: false } };

async function Checkout({ params }: { params: PageProps<"/dev/checkout/[sessionId]">["params"] }) {
  if (!simulatedPaymentsEnabled()) notFound();
  const { sessionId } = await params;
  const snapshot = await db.query.checkoutSession.findFirst({ where: eq(checkoutSession.id, sessionId) });
  if (!snapshot || snapshot.provider !== "simulated") notFound();
  const user = await getSessionUser();
  const c = snapshot.currency;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-12">
      <Notice tone="error" title="Simulated checkout: no payment is taken">
        This page stands in for Stripe in development and testing. It doesn&apos;t exist in production. Completing it creates the order
        through the same code a verified Stripe webhook would.
      </Notice>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
        <ul className="mt-4 divide-y divide-stone border-y border-stone">
          {snapshot.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-4 py-3 text-sm">
              <span>
                {l.quantity} × {l.productName}
                {l.optionName ? `, ${l.optionName}` : ""}
              </span>
              <span className="font-medium">{formatMoney(l.unitAmount * l.quantity, c)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-right text-sm">
          Subtotal <strong className="font-semibold">{formatMoney(snapshot.subtotal, c)}</strong>
        </p>
      </div>
      {snapshot.status === "open" ? (
        <SimulatedCheckoutForm
          sessionId={snapshot.id}
          email={user?.email ?? "guest@example.com"}
          countries={shippingCountries[c]}
          rates={shippingRates[c].map((r) => ({ id: r.id, label: `${r.name}: ${r.amount === 0 ? "Free" : formatMoney(r.amount, c)}` }))}
        />
      ) : (
        <Notice>This checkout has already finished ({snapshot.status}).</Notice>
      )}
    </div>
  );
}

export default function SimulatedCheckoutPage(props: PageProps<"/dev/checkout/[sessionId]">) {
  return (
    <Suspense fallback={<Loading />}>
      <Checkout params={props.params} />
    </Suspense>
  );
}
