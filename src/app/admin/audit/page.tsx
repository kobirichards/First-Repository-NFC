import { Suspense } from "react";
import { PageHeader, Table, adminDate } from "@/components/admin/ui";
import { listAuditEvents, requireAdmin } from "@/server/admin";
import { Loading } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { parsePage } from "@/server/pagination";

function Json({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-moss">None</span>;
  return <pre className="max-w-xs overflow-x-auto font-mono text-xs whitespace-pre-wrap">{JSON.stringify(value, null, 1)}</pre>;
}

async function Audit({ searchParams }: { searchParams: PageProps<"/admin/audit">["searchParams"] }) {
  const actor = await requireAdmin();
  const { rows: events, page, hasNext } = await listAuditEvents(actor, { page: parsePage((await searchParams).page) });
  if (events.length === 0) return <p className="text-moss">{page > 1 ? "No more entries." : "No admin changes have been made yet."}</p>;
  return (
    <>
      <Table caption="Audit log">
        <thead>
          <tr>
            <th>When</th>
            <th>Who</th>
            <th>Action</th>
            <th>Record</th>
            <th>Before</th>
            <th>After</th>
          </tr>
        </thead>
        <tbody className="align-top">
          {events.map((e) => (
            <tr key={e.id}>
              <td className="whitespace-nowrap">{adminDate.format(e.createdAt)}</td>
              <td>{e.actor?.email ?? "system / CLI"}</td>
              <td className="font-medium">{e.action}</td>
              <td className="font-mono text-xs">
                {e.entityType}/{e.entityId.slice(0, 8)}
              </td>
              <td>
                <Json value={e.before} />
              </td>
              <td>
                <Json value={e.after} />
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={page} hasNext={hasNext} pathname="/admin/audit" label="Audit log pages" />
    </>
  );
}

export default function AuditPage(props: PageProps<"/admin/audit">) {
  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every admin change, with who made it and what it was before and after. Entries can't be edited or deleted from the app."
      />
      <Suspense fallback={<Loading />}>
        <Audit searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
