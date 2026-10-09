import Link from "next/link";
import { Suspense } from "react";
import { reviewProofAction } from "@/actions/admin";
import { ActionForm, inputClass } from "@/components/admin/forms";
import { PageHeader, Pill, statusTone } from "@/components/admin/ui";
import { listProofs, requireAdmin } from "@/server/admin";
import { Loading } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { parsePage } from "@/server/pagination";

async function Proofs({ searchParams }: { searchParams: PageProps<"/admin/proofs">["searchParams"] }) {
  const actor = await requireAdmin();
  const { all, page } = await searchParams;
  const { rows: proofs, page: current, hasNext } = await listProofs(actor, all ? undefined : "PENDING", parsePage(page));
  return (
    <>
      <p className="mb-4 text-sm">
        {all ? (
          <Link href="/admin/proofs" className="text-bottle hover:underline">
            Show only proofs waiting for review
          </Link>
        ) : (
          <Link href="/admin/proofs?all=1" className="text-bottle hover:underline">
            Show all proofs
          </Link>
        )}
      </p>
      {proofs.length === 0 ? (
        <p className="text-moss">{current > 1 ? "No more proofs." : all ? "No proofs yet." : "Nothing waiting for review."}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {proofs.map((p) => {
            const c = p.orderItem.customisation;
            return (
              <li key={p.id} className="grid gap-5 rounded-card border border-stone bg-sheet p-5 md:grid-cols-[14rem_1fr]">
                <div className="flex aspect-[1.586] items-center justify-center rounded-control border border-stone bg-paper p-3">
                  {p.fileKey ? (
                    // eslint-disable-next-line @next/next/no-img-element -- admin-only artwork route
                    <img src={`/admin/${p.fileKey}`} alt="Uploaded logo" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-sm text-moss">No logo (text only)</span>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={`/admin/orders/${p.orderItem.order.id}`} className="font-semibold text-bottle hover:underline">
                      {p.orderItem.order.reference}
                    </Link>
                    <Pill tone={statusTone[p.status]}>{p.status.toLowerCase()}</Pill>
                  </div>
                  <dl className="grid grid-cols-[7rem_1fr] gap-y-1 text-sm">
                    <dt className="text-moss">Item</dt>
                    <dd>
                      {p.orderItem.quantity} × {p.orderItem.productName}
                      {p.orderItem.optionName ? `, ${p.orderItem.optionName}` : ""}
                    </dd>
                    <dt className="text-moss">Name</dt>
                    <dd>{c?.printName ?? "None"}</dd>
                    <dt className="text-moss">Title</dt>
                    <dd>{c?.printTitle ?? "None"}</dd>
                    {p.reviewNotes ? (
                      <>
                        <dt className="text-moss">Notes</dt>
                        <dd>{p.reviewNotes}</dd>
                      </>
                    ) : null}
                  </dl>
                  {p.status === "PENDING" ? (
                    <ActionForm action={reviewProofAction.bind(null, p.id)} submitLabel="Save decision" className="flex flex-col gap-3">
                      <fieldset className="flex flex-wrap gap-4 text-sm">
                        <legend className="sr-only">Decision</legend>
                        <label className="flex items-center gap-2">
                          <input type="radio" name="decision" value="APPROVED" defaultChecked className="accent-bottle" /> Approve for
                          printing
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="radio" name="decision" value="REJECTED" className="accent-bottle" /> Ask the customer for a change
                        </label>
                      </fieldset>
                      <label className="flex flex-col gap-1 text-sm font-medium">
                        Notes (required when asking for a change; emailed to the customer)
                        <input name="notes" className={inputClass} />
                      </label>
                    </ActionForm>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={current} hasNext={hasNext} pathname="/admin/proofs" params={{ all: all ? "1" : undefined }} label="Proof pages" />
    </>
  );
}

export default function AdminProofsPage(props: PageProps<"/admin/proofs">) {
  return (
    <>
      <PageHeader
        title="Proofs"
        description="Check printed names, titles and logos before production. Orders start production when all their proofs are approved."
      />
      <Suspense fallback={<Loading />}>
        <Proofs searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
