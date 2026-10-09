import Link from "next/link";
import { Suspense } from "react";
import { PageHeader, Pill, Table, adminDate, statusTone } from "@/components/admin/ui";
import { type Currency, formatMoney } from "@/config/commerce";
import { orderStatusLabel } from "@/lib/order-status";
import { ORDER_STATUSES, type OrderStatus, listOrders, requireAdmin } from "@/server/admin";
import { Loading } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { parsePage } from "@/server/pagination";

async function Orders({ searchParams }: { searchParams: PageProps<"/admin/orders">["searchParams"] }) {
  const actor = await requireAdmin();
  const { status, page } = await searchParams;
  const filter = ORDER_STATUSES.includes(status as OrderStatus) ? (status as OrderStatus) : undefined;
  const { rows: orders, page: current, hasNext } = await listOrders(actor, { status: filter, page: parsePage(page) });
  return (
    <>
      <nav aria-label="Filter by status" className="mb-4 flex flex-wrap gap-2 text-sm">
        {[undefined, ...ORDER_STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={s ? `/admin/orders?status=${s}` : "/admin/orders"}
            aria-current={s === filter ? "page" : undefined}
            className="rounded-control border border-stone px-3 py-1 aria-[current=page]:border-bottle aria-[current=page]:bg-bottle aria-[current=page]:text-white"
          >
            {s ? orderStatusLabel[s].label : "All"}
          </Link>
        ))}
      </nav>
      {orders.length === 0 ? (
        <p className="text-moss">{current > 1 ? "No more orders." : `No orders${filter ? " with this status" : " yet"}.`}</p>
      ) : (
        <Table caption="Orders">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Cards</th>
              <th>Total</th>
              <th>Status</th>
              <th>Placed</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold text-bottle hover:underline">
                    {o.reference}
                  </Link>
                </td>
                <td>{o.email}</td>
                <td>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                <td>{formatMoney(o.total, o.currency as Currency)}</td>
                <td>
                  <Pill tone={statusTone[o.status]}>{orderStatusLabel[o.status]?.label}</Pill>
                </td>
                <td className="whitespace-nowrap text-moss">{adminDate.format(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={current} hasNext={hasNext} pathname="/admin/orders" params={{ status: filter }} label="Order pages" />
    </>
  );
}

export default function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  return (
    <>
      <PageHeader title="Orders" />
      <Suspense fallback={<Loading />}>
        <Orders searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
