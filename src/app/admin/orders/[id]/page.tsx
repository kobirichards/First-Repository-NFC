import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { assignCardsAction, recordRefundAction, updateOrderStatusAction } from "@/actions/admin";
import { ActionForm, inputClass } from "@/components/admin/forms";
import { PageHeader, Pill, Section, adminDate, statusTone } from "@/components/admin/ui";
import { type Currency, formatMoney } from "@/config/commerce";
import { orderStatusLabel } from "@/lib/order-status";
import { NotFoundError } from "@/server/errors";
import { ORDER_STATUSES, getOrderForAdmin, listAuditEvents, requireAdmin } from "@/server/admin";
import { Loading } from "@/components/ui/loading";

async function OrderAdmin({ params }: { params: PageProps<"/admin/orders/[id]">["params"] }) {
  const actor = await requireAdmin();
  const { id } = await params;
  let o;
  try {
    o = await getOrderForAdmin(actor, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const c = o.currency as Currency;
  const { rows: history } = await listAuditEvents(actor, { entityType: "order", entityId: o.id, size: 50 });
  const address = o.shippingAddress as Record<string, string | null> | null;
  const refunded = o.refunds.reduce((n, r) => n + r.amount, 0);

  return (
    <>
      <PageHeader
        title={`Order ${o.reference}`}
        description={`Placed ${adminDate.format(o.createdAt)} by ${o.email}${o.user ? " (account)" : " (guest)"}`}
        actions={<Pill tone={statusTone[o.status]}>{orderStatusLabel[o.status]?.label}</Pill>}
      />
      {o.notes ? <p className="mb-6 rounded-control border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{o.notes}</p> : null}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-6">
          <Section title="Items and cards">
            <ul className="flex flex-col gap-6">
              {o.items.map((item) => (
                <li key={item.id} className="border-b border-stone pb-6 last:border-0 last:pb-0">
                  <div className="flex justify-between gap-4">
                    <p className="font-semibold">
                      {item.quantity} × {item.productName}
                      {item.optionName ? `, ${item.optionName}` : ""}
                    </p>
                    <p>{formatMoney(item.unitAmount * item.quantity, c)}</p>
                  </div>
                  {item.customisation ? (
                    <p className="mt-1 text-sm text-moss">
                      Print: {[item.customisation.printName, item.customisation.printTitle].filter(Boolean).join(" / ") || "logo only"}
                      {item.customisation.artworkKey ? " + logo" : ""}{" "}
                      {item.proofs.length ? (
                        <Link href="/admin/proofs" className="text-bottle underline">
                          proof: {item.proofs.map((p) => p.status.toLowerCase()).join(", ")}
                        </Link>
                      ) : null}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm">
                    Cards assigned: {item.cards.length} of {item.quantity}
                  </p>
                  {item.cards.length ? (
                    <ul className="mt-1 flex flex-wrap gap-2 text-xs">
                      {item.cards.map((card) => (
                        <li key={card.id}>
                          <Link href={`/admin/cards/${card.id}`} className="font-mono text-bottle hover:underline">
                            {card.token.slice(0, 8)}…
                          </Link>{" "}
                          <Pill tone={statusTone[card.status]}>{card.status.toLowerCase()}</Pill>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {item.cards.length < item.quantity ? (
                    <ActionForm action={assignCardsAction.bind(null, item.id)} submitLabel="Assign cards" variant="secondary" className="mt-3 flex flex-col gap-2">
                      <label htmlFor={`tokens-${item.id}`} className="text-sm font-medium">
                        Card URLs or tokens, one per line. Leave empty to take {item.quantity - item.cards.length} from stock.
                      </label>
                      <textarea id={`tokens-${item.id}`} name="tokens" rows={2} className="rounded-control border border-ink/20 bg-sheet p-2 font-mono text-xs" />
                    </ActionForm>
                  ) : null}
                </li>
              ))}
            </ul>
            <dl className="mt-6 ml-auto max-w-xs space-y-1 text-sm">
              {[
                ["Subtotal", o.subtotal],
                ["Delivery", o.shipping],
                ["Tax", o.tax],
                ["Total", o.total],
                ...(refunded ? [["Refunded", -refunded] as const] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-moss">{k}</dt>
                  <dd>{formatMoney(Number(v), c)}</dd>
                </div>
              ))}
            </dl>
          </Section>
          <Section title="History">
            {history.length === 0 ? (
              <p className="text-sm text-moss">No admin changes yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {history.map((h) => (
                  <li key={h.id}>
                    <span className="text-moss">{adminDate.format(h.createdAt)}</span> {h.action} by {h.actor?.email ?? "system"}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
        <div className="flex flex-col gap-6">
          <Section title="Status">
            <ActionForm action={updateOrderStatusAction.bind(null, o.id)} submitLabel="Update order">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Status
                <select name="status" defaultValue={o.status} className={inputClass}>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {orderStatusLabel[s].label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Tracking number
                <input name="trackingNumber" defaultValue={o.trackingNumber ?? ""} className={inputClass} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="notify" defaultChecked className="accent-bottle" /> Email the customer about this change
              </label>
            </ActionForm>
          </Section>
          <Section title="Delivery">
            <address className="text-sm leading-relaxed not-italic">
              {[o.shippingName, address?.line1, address?.line2, address?.city, address?.postalCode, address?.country].filter(Boolean).map((l, i) => (
                <span key={i} className="block">
                  {l}
                </span>
              ))}
            </address>
          </Section>
          <Section title="Record a refund">
            <p className="mb-3 text-sm text-moss">Issue the refund in the Stripe dashboard first. This records it here; it doesn&apos;t move money.</p>
            <ActionForm action={recordRefundAction.bind(null, o.id)} submitLabel="Record refund" variant="secondary">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Amount ({c})
                <input name="amount" inputMode="decimal" placeholder="24.00" className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Stripe refund ID (optional)
                <input name="stripeRefundId" placeholder="re_…" className={inputClass} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Reason
                <input name="reason" className={inputClass} />
              </label>
            </ActionForm>
          </Section>
          {o.user ? (
            <Link href={`/admin/customers/${o.user.id}`} className="text-sm font-semibold text-bottle hover:underline">
              View customer
            </Link>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default function AdminOrderPage(props: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <OrderAdmin params={props.params} />
    </Suspense>
  );
}
