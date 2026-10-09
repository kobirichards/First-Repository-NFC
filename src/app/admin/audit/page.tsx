import { Suspense } from "react";
import { PageHeader, Table, adminDate } from "@/components/admin/ui";
import { listAuditEvents, requireAdmin } from "@/server/admin";

function Json({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-moss">—</span>;
  return <pre className="max-w-xs overflow-x-auto font-mono text-xs whitespace-pre-wrap">{JSON.stringify(value, null, 1)}</pre>;
}

async function Audit() {
  const actor = await requireAdmin();
  const events = await listAuditEvents(actor, { limit: 300 });
  return (
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
  );
}

export default function AuditPage() {
  return (
    <>
      <PageHeader title="Audit log" description="Every admin change, with who made it and what it was before and after. Entries can't be edited or deleted from the app." />
      <Suspense fallback={<p className="text-moss">Loading…</p>}>
        <Audit />
      </Suspense>
    </>
  );
}
