import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader, Pill, Section, adminDate, statusTone } from "@/components/admin/ui";
import { type Currency, formatMoney } from "@/config/commerce";
import { orderStatusLabel } from "@/lib/order-status";
import { NotFoundError } from "@/server/errors";
import { getCustomer, requireAdmin } from "@/server/admin";

async function Customer({ params }: { params: PageProps<"/admin/customers/[id]">["params"] }) {
  const actor = await requireAdmin();
  const { id } = await params;
  let c;
  try {
    c = await getCustomer(actor, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  return (
    <>
      <PageHeader title={c.name} description={`${c.email}, joined ${adminDate.format(c.createdAt)}`} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Account">
          <dl className="grid grid-cols-[9rem_1fr] gap-y-2 text-sm">
            <dt className="text-moss">Email confirmed</dt>
            <dd>{c.emailVerified ? "Yes" : "No"}</dd>
            <dt className="text-moss">Role</dt>
            <dd>{c.role ?? "user"}</dd>
            <dt className="text-moss">Two-step</dt>
            <dd>{c.twoFactorEnabled ? "On" : "Off"}</dd>
            <dt className="text-moss">Profile</dt>
            <dd>
              {c.profile ? (
                c.profile.isPublished ? (
                  <Link href={`/p/${c.profile.slug}`} className="text-bottle hover:underline">
                    /p/{c.profile.slug}
                  </Link>
                ) : (
                  `/p/${c.profile.slug} (unpublished)`
                )
              ) : (
                "None"
              )}
            </dd>
          </dl>
        </Section>
        <Section title="Cards">
          {c.cards.length === 0 ? (
            <p className="text-sm text-moss">No cards.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {c.cards.map((card) => (
                <li key={card.id} className="flex items-center gap-2">
                  <Link href={`/admin/cards/${card.id}`} className="font-mono text-bottle hover:underline">
                    {card.token.slice(0, 10)}…
                  </Link>
                  <Pill tone={statusTone[card.status]}>{card.status.toLowerCase()}</Pill>
                  {card.label ? <span className="text-moss">{card.label}</span> : null}
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Orders" className="xl:col-span-2">
          {c.orders.length === 0 ? (
            <p className="text-sm text-moss">No orders.</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {c.orders.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-semibold text-bottle hover:underline">
                    {o.reference}
                  </Link>
                  <span>{formatMoney(o.total, o.currency as Currency)}</span>
                  <Pill tone={statusTone[o.status]}>{orderStatusLabel[o.status]?.label}</Pill>
                  <span className="text-moss">{adminDate.format(o.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}

export default function AdminCustomerPage(props: PageProps<"/admin/customers/[id]">) {
  return (
    <Suspense fallback={<p className="text-moss">Loading…</p>}>
      <Customer params={props.params} />
    </Suspense>
  );
}
