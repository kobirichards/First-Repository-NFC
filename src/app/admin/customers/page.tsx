import Link from "next/link";
import { Suspense } from "react";
import { inputClass } from "@/components/admin/forms";
import { PageHeader, Pill, Table, adminDate } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { listCustomers, requireAdmin } from "@/server/admin";

async function Customers({ searchParams }: { searchParams: PageProps<"/admin/customers">["searchParams"] }) {
  const actor = await requireAdmin();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const customers = await listCustomers(actor, query);
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
    </>
  );
}

export default function AdminCustomersPage(props: PageProps<"/admin/customers">) {
  return (
    <>
      <PageHeader title="Customers" />
      <Suspense fallback={<p className="text-moss">Loading…</p>}>
        <Customers searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
