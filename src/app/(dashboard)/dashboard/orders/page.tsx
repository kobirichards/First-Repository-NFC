import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { type Currency, formatMoney } from "@/config/commerce";
import { orderStatusLabel } from "@/lib/order-status";
import { listOwnOrders } from "@/server/orders";
import { requireUser } from "@/server/session";
import { Loading } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { parsePage } from "@/server/pagination";

export const metadata: Metadata = { title: "Your orders", robots: { index: false } };

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

async function Orders({ searchParams }: { searchParams: PageProps<"/dashboard/orders">["searchParams"] }) {
  const user = await requireUser("/dashboard/orders");
  const { rows: orders, page, hasNext } = await listOwnOrders(user.id, parsePage((await searchParams).page));
  if (orders.length === 0 && page > 1) return <p className="text-moss">No more orders.</p>;
  if (orders.length === 0) {
    return (
      <div className="rounded-card border border-stone bg-sheet p-6 sm:p-8">
        <h2 className="text-lg font-semibold">No orders yet</h2>
        <p className="mt-2 text-moss">Orders you place while signed in appear here.</p>
        <ButtonLink href="/shop" className="mt-6">
          Browse cards
        </ButtonLink>
      </div>
    );
  }
  return (
    <>
      <ul className="divide-y divide-stone rounded-card border border-stone bg-sheet">
        {orders.map((o) => {
          const cards = o.items.reduce((n, i) => n + i.quantity, 0);
          return (
            <li key={o.id}>
              <Link
                href={`/dashboard/orders/${o.reference}`}
                className="flex flex-wrap items-center justify-between gap-3 p-5 hover:bg-paper"
              >
                <span>
                  <span className="block font-semibold">{o.reference}</span>
                  <span className="text-sm text-moss">
                    {dateFormat.format(o.createdAt)}, {cards} {cards === 1 ? "card" : "cards"}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-semibold">{formatMoney(o.total, o.currency as Currency)}</span>
                  <span className="text-sm text-moss">{orderStatusLabel[o.status]?.label ?? o.status}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <Pagination page={page} hasNext={hasNext} pathname="/dashboard/orders" label="Order pages" />
    </>
  );
}

export default function OrdersPage(props: PageProps<"/dashboard/orders">) {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">Your orders</h1>
      <Suspense fallback={<Loading label="Loading your orders" />}>
        <Orders searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
