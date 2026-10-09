import Link from "next/link";
import { Suspense } from "react";
import { PageHeader, Pill, Table } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { type Currency, formatMoney } from "@/config/commerce";
import { listProductsForAdmin, requireAdmin } from "@/server/admin";
import { Loading } from "@/components/ui/loading";

async function Products() {
  const actor = await requireAdmin();
  const products = await listProductsForAdmin(actor);
  return (
    <Table caption="Products">
      <thead>
        <tr>
          <th>Product</th>
          <th>Finishes</th>
          <th>Base prices</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {products.map((p) => (
          <tr key={p.id}>
            <td>
              <Link href={`/admin/products/${p.id}`} className="font-semibold text-bottle hover:underline">
                {p.name}
              </Link>
            </td>
            <td>{p.options.length}</td>
            <td>
              {p.prices
                .filter((x) => !x.optionId)
                .map((x) => formatMoney(x.amount, x.currency as Currency))
                .join(", ") || "None"}
            </td>
            <td>{p.isActive ? <Pill tone="good">on sale</Pill> : <Pill>hidden</Pill>}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export default function AdminProductsPage() {
  return (
    <>
      <PageHeader
        title="Products"
        description="Prices are fixed per currency. A finish's own price, if set, replaces the product price."
        actions={
          <Link href="/admin/products/new" className={buttonClass("primary")}>
            New product
          </Link>
        }
      />
      <Suspense fallback={<Loading />}>
        <Products />
      </Suspense>
    </>
  );
}
