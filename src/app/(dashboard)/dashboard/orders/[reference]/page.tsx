import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { type Currency, formatMoney } from "@/config/commerce";
import { orderStatusLabel } from "@/lib/order-status";
import { NotFoundError } from "@/server/errors";
import { getOwnOrder } from "@/server/orders";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Order", robots: { index: false } };

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

async function OrderDetail({ params }: { params: PageProps<"/dashboard/orders/[reference]">["params"] }) {
  const { reference } = await params;
  const user = await requireUser(`/dashboard/orders/${reference}`);
  let o;
  try {
    o = await getOwnOrder(user.id, reference);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const c = o.currency as Currency;
  const status = orderStatusLabel[o.status] ?? { label: o.status, detail: "" };
  const address = o.shippingAddress as { line1?: string; line2?: string; city?: string; postalCode?: string; country?: string } | null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/dashboard/orders" className="text-sm text-moss hover:text-ink">
          All orders
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Order {o.reference}</h1>
        <p className="mt-1 text-moss">Placed {dateFormat.format(o.createdAt)}</p>
      </div>

      <section aria-labelledby="status" className="rounded-card border border-stone bg-sheet p-5">
        <h2 id="status" className="font-semibold">
          {status.label}
        </h2>
        <p className="mt-1 text-sm text-moss">{status.detail}</p>
        {o.trackingNumber ? <p className="mt-2 text-sm">Tracking number: {o.trackingNumber}</p> : null}
      </section>

      <section aria-labelledby="items">
        <h2 id="items" className="text-lg font-semibold">
          Items
        </h2>
        <ul className="mt-3 divide-y divide-stone border-y border-stone">
          {o.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4 py-4">
              <div>
                <p className="font-medium">
                  {i.quantity} × {i.productName}
                  {i.optionName ? `, ${i.optionName}` : ""}
                </p>
                {i.customisation?.printName ? <p className="text-sm text-moss">Printed name: {i.customisation.printName}</p> : null}
                {i.customisation?.printTitle ? <p className="text-sm text-moss">Printed title: {i.customisation.printTitle}</p> : null}
                {i.proofs.map((p, n) => (
                  <p key={n} className="text-sm text-moss">
                    Logo proof: {p.status === "PENDING" ? "being prepared" : p.status === "APPROVED" ? "approved" : "changes needed"}
                  </p>
                ))}
              </div>
              <p className="font-medium">{formatMoney(i.unitAmount * i.quantity, c)}</p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 ml-auto max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-moss">Subtotal</dt>
            <dd>{formatMoney(o.subtotal, c)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-moss">Delivery</dt>
            <dd>{o.shipping === 0 ? "Free" : formatMoney(o.shipping, c)}</dd>
          </div>
          {o.tax ? (
            <div className="flex justify-between">
              <dt className="text-moss">Tax</dt>
              <dd>{formatMoney(o.tax, c)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-stone pt-1.5 font-semibold">
            <dt>Total</dt>
            <dd>{formatMoney(o.total, c)}</dd>
          </div>
          {o.refunds.map((r) => (
            <div key={r.id} className="flex justify-between text-moss">
              <dt>Refunded</dt>
              <dd>−{formatMoney(r.amount, c)}</dd>
            </div>
          ))}
        </dl>
      </section>

      {address ? (
        <section aria-labelledby="delivery">
          <h2 id="delivery" className="text-lg font-semibold">
            Delivery address
          </h2>
          <address className="mt-2 text-sm leading-relaxed not-italic text-moss">
            {[o.shippingName, address.line1, address.line2, address.city, address.postalCode, address.country].filter(Boolean).map((part, i) => (
              <span key={i} className="block">
                {part}
              </span>
            ))}
          </address>
        </section>
      ) : null}
    </div>
  );
}

export default function OrderPage(props: PageProps<"/dashboard/orders/[reference]">) {
  return (
    <Suspense fallback={<p className="text-moss">Loading order…</p>}>
      <OrderDetail params={props.params} />
    </Suspense>
  );
}
