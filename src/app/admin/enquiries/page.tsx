import { Suspense } from "react";
import { EnquiryStatusSelect } from "@/components/admin/enquiry-status";
import { PageHeader, adminDate } from "@/components/admin/ui";
import { listEnquiries, requireAdmin } from "@/server/admin";
import { Loading } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { parsePage } from "@/server/pagination";

async function Enquiries({ searchParams }: { searchParams: PageProps<"/admin/enquiries">["searchParams"] }) {
  const actor = await requireAdmin();
  const { rows: enquiries, page, hasNext } = await listEnquiries(actor, undefined, parsePage((await searchParams).page));
  if (enquiries.length === 0) return <p className="text-moss">{page > 1 ? "No more enquiries." : "No enquiries yet."}</p>;
  return (
    <>
      <ul className="flex flex-col gap-4">
        {enquiries.map((e) => (
          <li key={e.id} className="rounded-card border border-stone bg-sheet p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {e.company ?? "No company"}: {e.quantity ?? "?"} cards, {e.timeline ?? "no timeline"}
                </p>
                <p className="text-sm text-moss">
                  {e.name},{" "}
                  <a href={`mailto:${e.email}`} className="text-bottle hover:underline">
                    {e.email}
                  </a>
                  {e.phone ? `, ${e.phone}` : ""}. Received {adminDate.format(e.createdAt)}
                </p>
              </div>
              <EnquiryStatusSelect id={e.id} status={e.status} />
            </div>
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-line">{e.message}</p>
          </li>
        ))}
      </ul>
      <Pagination page={page} hasNext={hasNext} pathname="/admin/enquiries" label="Enquiry pages" />
    </>
  );
}

export default function AdminEnquiriesPage(props: PageProps<"/admin/enquiries">) {
  return (
    <>
      <PageHeader title="Enquiries" description="Team and bulk quote requests." />
      <Suspense fallback={<Loading />}>
        <Enquiries searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
