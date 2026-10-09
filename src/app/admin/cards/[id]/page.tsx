import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CardAdminActions } from "@/components/admin/card-actions";
import { PageHeader, Pill, Section, adminDate, statusTone } from "@/components/admin/ui";
import { NotFoundError } from "@/server/errors";
import { cardUrl } from "@/server/links";
import { getCardForAdmin, listAuditEvents, requireAdmin } from "@/server/admin";

async function CardAdmin({ params }: { params: PageProps<"/admin/cards/[id]">["params"] }) {
  const actor = await requireAdmin();
  const { id } = await params;
  let c;
  try {
    c = await getCardForAdmin(actor, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const history = await listAuditEvents(actor, { entityType: "card", entityId: c.id, limit: 50 });
  return (
    <>
      <PageHeader title="Card" description={<span className="font-mono">{cardUrl(c.token)}</span>} actions={<Pill tone={statusTone[c.status]}>{c.status.toLowerCase()}</Pill>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Details">
          <dl className="grid grid-cols-[8rem_1fr] gap-y-2 text-sm">
            <dt className="text-moss">Owner</dt>
            <dd>{c.owner ? <Link href={`/admin/customers/${c.owner.id}`} className="text-bottle hover:underline">{c.owner.email}</Link> : "None"}</dd>
            <dt className="text-moss">Opens</dt>
            <dd>{c.destination === "LINKEDIN" ? "LinkedIn" : c.profile ? `/p/${c.profile.slug}${c.profile.isPublished ? "" : " (unpublished)"}` : "No profile"}</dd>
            <dt className="text-moss">Batch</dt>
            <dd>{c.batch?.label ?? "None"}</dd>
            <dt className="text-moss">Order</dt>
            <dd>{c.orderItem ? <Link href={`/admin/orders/${c.orderItem.order.id}`} className="text-bottle hover:underline">{c.orderItem.order.reference}</Link> : "None"}</dd>
            <dt className="text-moss">Claimed</dt>
            <dd>{c.claimedAt ? adminDate.format(c.claimedAt) : "No"}</dd>
          </dl>
        </Section>
        <Section title="Actions">
          <CardAdminActions cardId={c.id} status={c.status} hasOwner={Boolean(c.owner)} />
        </Section>
        <Section title="Assignment history">
          {c.assignments.length === 0 ? (
            <p className="text-sm text-moss">Never assigned.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {c.assignments.map((a) => (
                <li key={a.id}>
                  {adminDate.format(a.assignedAt)}: {a.method}
                  {a.endedAt ? `, ended ${adminDate.format(a.endedAt)}` : " (current)"}
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Admin changes">
          {history.length === 0 ? (
            <p className="text-sm text-moss">None.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {history.map((h) => (
                <li key={h.id}>
                  {adminDate.format(h.createdAt)}: {h.action} by {h.actor?.email ?? "system"}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}

export default function AdminCardPage(props: PageProps<"/admin/cards/[id]">) {
  return (
    <Suspense fallback={<p className="text-moss">Loading…</p>}>
      <CardAdmin params={props.params} />
    </Suspense>
  );
}
