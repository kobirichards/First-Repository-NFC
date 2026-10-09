import Link from "next/link";
import { Suspense } from "react";
import { inputClass } from "@/components/admin/forms";
import { PageHeader, Pill, Table, adminDate } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { listCustomers, requireAdmin } from "@/server/admin";
import { Loading } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { parsePage } from "@/server/pagination";

async function Customers({ searchParams }: { searchParams: PageProps<"/admin/customers">["searchParams"] }) {
  const actor = await requireAdmin();
  const { q, page } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const { rows: customers, page: current, hasNext } = await listCustomers(actor, query, parsePage(page));
  return (
    <>
      <form className="mb-5 flex flex-wrap gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Search customers
        </label>
        <input id="q" name="q" defaultValue={query} placeholder="Name or email" className={`${inputClass} w-72 max-w-full`} />
        <button type="submit" className={buttonClass("secondary")}>
          Search
        </button>
      </form>
      {customers.length === 0 ? (
        <p className="text-moss">{query ? `No customers match “${query}”.` : current > 1 ? "No more customers." : "No customers yet."}</p>
      ) : (
        <Table caption="Customers">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Joined</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/customers/${c.id}`} className="font-semibold text-bottle hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td>{c.email}</td>
                <td className="text-moss">{adminDate.format(c.createdAt)}</td>
                <td className="flex gap-2">
                  {c.role === "admin" ? <Pill tone="warn">admin</Pill> : null}
                  {c.emailVerified ? null : <Pill>unverified</Pill>}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={current} hasNext={hasNext} pathname="/admin/customers" params={{ q: query }} label="Customer pages" />
    </>
  );
}

export default function AdminCustomersPage(props: PageProps<"/admin/customers">) {
  return (
    <>
      <PageHeader title="Customers" />
      <Suspense fallback={<Loading />}>
        <Customers searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
