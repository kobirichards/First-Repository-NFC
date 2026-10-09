import { Suspense } from "react";
import { CreateBatchForm, RegenerateCodesButton } from "@/components/admin/batch-forms";
import { PageHeader, Section, Table, adminDate } from "@/components/admin/ui";
import { listBatches, requireAdmin } from "@/server/admin";

async function Batches() {
  const actor = await requireAdmin();
  const batches = await listBatches(actor);
  return (
    <div className="flex flex-col gap-6">
      <Section title="New batch">
        <CreateBatchForm />
      </Section>
      {batches.length === 0 ? (
        <p className="text-moss">No batches yet.</p>
      ) : (
        <Table caption="Card batches">
          <thead>
            <tr>
              <th>Batch</th>
              <th>Cards</th>
              <th>Unclaimed</th>
              <th>Active</th>
              <th>Created</th>
              <th>Files</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => (
              <tr key={b.id}>
                <td className="font-medium">{b.label}</td>
                <td>{b.quantity}</td>
                <td>{b.unclaimed}</td>
                <td>{b.active}</td>
                <td className="whitespace-nowrap text-moss">
                  {adminDate.format(b.createdAt)}
                  {b.createdBy ? ` by ${b.createdBy.email}` : ""}
                </td>
                <td className="flex flex-wrap items-center gap-3">
                  <a href={`/admin/batches/${b.id}/qr`} className="text-sm font-semibold text-bottle hover:underline">
                    QR codes (zip)
                  </a>
                  {b.unclaimed ? <RegenerateCodesButton batchId={b.id} /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <p className="text-sm text-moss">
        Writing the chips is a manual step: see docs/nfc-programming.md. Each card&apos;s chip must hold exactly the URL in the CSV.
      </p>
    </div>
  );
}

export default function BatchesPage() {
  return (
    <>
      <PageHeader title="Card batches" description="Generate card links and claim codes for the printer." />
      <Suspense fallback={<p className="text-moss">Loading…</p>}>
        <Batches />
      </Suspense>
    </>
  );
}
