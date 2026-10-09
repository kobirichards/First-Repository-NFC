import Link from "next/link";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/ui";
import { countEnquiries, countProofs, orderCounts, requireAdmin } from "@/server/admin";
import { Loading } from "@/components/ui/loading";

async function Overview() {
  const actor = await requireAdmin();
  const [counts, proofs, enquiries] = await Promise.all([orderCounts(actor), countProofs(actor, "PENDING"), countEnquiries(actor, "NEW")]);
  const tiles = [
    { label: "Orders to start", value: counts.PAID ?? 0, href: "/admin/orders?status=PAID", hint: "Paid, no printing needed" },
    { label: "Proofs to review", value: proofs, href: "/admin/proofs", hint: "Printing waits on these" },
    { label: "In production", value: counts.IN_PRODUCTION ?? 0, href: "/admin/orders?status=IN_PRODUCTION", hint: "Ship and add tracking" },
    { label: "New enquiries", value: enquiries, href: "/admin/enquiries", hint: "Team quote requests" },
  ];
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {tiles.map((t) => (
        <li key={t.label}>
          <Link href={t.href} className="block rounded-card border border-stone bg-sheet p-5 hover:border-bottle">
            <p className="text-sm text-moss">{t.label}</p>
            <p className="mt-1 text-3xl font-bold">{t.value}</p>
            <p className="mt-1 text-xs text-moss">{t.hint}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function AdminHome() {
  return (
    <>
      <PageHeader title="Overview" description="What needs doing next." />
      <Suspense fallback={<Loading />}>
        <Overview />
      </Suspense>
    </>
  );
}
