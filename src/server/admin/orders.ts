import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { type Currency, formatMoney } from "@/config/commerce";
import { env } from "@/config/env";
import type { Db } from "@/db";
import { db as defaultDb } from "@/db";
import { card, cardAssignment, order, orderItem, orderStatus, refund, user } from "@/db/schema";
import { sendEmail } from "../email";
import { orderStatusMessage } from "../email/templates";
import { NotFoundError, UserFacingError } from "../errors";
import { ensureOwnProfile } from "../profiles";
import { recordAudit } from "./audit";
import { type AdminActor, assertAdmin } from "./guard";

export type OrderStatus = (typeof orderStatus.enumValues)[number];
export const ORDER_STATUSES = orderStatus.enumValues;

export async function listOrders(actor: AdminActor, filter: { status?: OrderStatus } = {}, db: Db = defaultDb) {
  assertAdmin(actor);
  return db.query.order.findMany({
    where: filter.status ? eq(order.status, filter.status) : undefined,
    orderBy: [desc(order.createdAt)],
    limit: 200,
    columns: { id: true, reference: true, email: true, status: true, currency: true, total: true, createdAt: true },
    with: { items: { columns: { quantity: true } } },
  });
}

export async function getOrderForAdmin(actor: AdminActor, orderId: string, db: Db = defaultDb) {
  assertAdmin(actor);
  const row = await db.query.order.findFirst({
    where: eq(order.id, orderId),
    with: {
      user: { columns: { id: true, email: true, name: true } },
      items: { with: { cards: { columns: { id: true, token: true, status: true } }, proofs: true } },
      refunds: { with: { order: { columns: { id: true } } } },
    },
  });
  if (!row) throw new NotFoundError("Order not found.");
  return row;
}

const statusEmails: Partial<Record<OrderStatus, { heading: string; body: string }>> = {
  IN_PRODUCTION: { heading: "Your cards are being made", body: "We've started making your cards. We'll email you when they ship." },
  SHIPPED: { heading: "Your cards are on their way", body: "Your order has shipped. When the cards arrive, tap one with your phone to set it up." },
  CANCELLED: { heading: "Your order was cancelled", body: "Your order has been cancelled. If you were charged, any refund is shown on your order." },
};

export async function updateOrderStatus(
  actor: AdminActor,
  orderId: string,
  input: { status: OrderStatus; trackingNumber?: string | null; notify?: boolean },
  db: Db = defaultDb,
) {
  assertAdmin(actor);
  if (!ORDER_STATUSES.includes(input.status)) throw new UserFacingError("Choose a valid status.", "status");
  const tracking = input.trackingNumber?.trim() || null;
  if (tracking && tracking.length > 100) throw new UserFacingError("Tracking numbers can be at most 100 characters.", "trackingNumber");
  const updated = await db.transaction(async (tx) => {
    const before = await tx.query.order.findFirst({ where: eq(order.id, orderId) });
    if (!before) throw new NotFoundError("Order not found.");
    const [after] = await tx
      .update(order)
      .set({ status: input.status, trackingNumber: tracking ?? before.trackingNumber })
      .where(eq(order.id, orderId))
      .returning();
    await recordAudit(
      tx,
      actor,
      "order.status",
      { type: "order", id: orderId },
      { status: before.status, trackingNumber: before.trackingNumber },
      { status: after.status, trackingNumber: after.trackingNumber },
    );
    return { before, after };
  });
  const message = statusEmails[input.status];
  if (input.notify !== false && message && updated.before.status !== input.status && updated.after.email) {
    const body = input.status === "SHIPPED" && updated.after.trackingNumber ? `${message.body} Tracking number: ${updated.after.trackingNumber}.` : message.body;
    await sendEmail(
      orderStatusMessage(
        updated.after.email,
        updated.after.reference,
        message.heading,
        body,
        updated.after.userId ? `${env.appUrl}/dashboard/orders/${updated.after.reference}` : null,
      ),
    ).catch((e: unknown) => console.error("[admin] status email failed:", e instanceof Error ? e.message : e));
  }
}

/** Records a refund made in Stripe. It does not move money: issue the refund in the Stripe dashboard first. */
export async function recordRefund(
  actor: AdminActor,
  orderId: string,
  input: { amount: number; reason?: string; stripeRefundId?: string },
  db: Db = defaultDb,
) {
  assertAdmin(actor);
  if (!Number.isInteger(input.amount) || input.amount <= 0) throw new UserFacingError("Enter the refunded amount.", "amount");
  if (input.stripeRefundId && !/^re_[A-Za-z0-9]+$/.test(input.stripeRefundId)) {
    throw new UserFacingError("Stripe refund IDs start with re_.", "stripeRefundId");
  }
  await db.transaction(async (tx) => {
    const o = await tx.query.order.findFirst({ where: eq(order.id, orderId), with: { refunds: true } });
    if (!o) throw new NotFoundError("Order not found.");
    const already = o.refunds.reduce((n, r) => n + r.amount, 0);
    if (already + input.amount > o.total) {
      throw new UserFacingError(`That's more than is left to refund (${formatMoney(o.total - already, o.currency as Currency)}).`, "amount");
    }
    const [created] = await tx
      .insert(refund)
      .values({ orderId, amount: input.amount, reason: input.reason?.trim().slice(0, 500) || null, stripeRefundId: input.stripeRefundId || null, recordedById: actor.id })
      .returning();
    const status: OrderStatus = already + input.amount === o.total ? "REFUNDED" : "PARTIALLY_REFUNDED";
    await tx.update(order).set({ status }).where(eq(order.id, orderId));
    await recordAudit(tx, actor, "order.refund", { type: "order", id: orderId }, { status: o.status, refunded: already }, { status, refunded: already + input.amount, refundId: created.id });
  });
}

/**
 * Links physical cards to an order line. Give card tokens (or card URLs), or
 * leave empty to take the next unclaimed cards from stock. If the order
 * belongs to an account, the cards are activated for that customer straight
 * away; otherwise the customer claims them with the printed codes.
 */
export async function assignCardsToOrderItem(
  actor: AdminActor,
  orderItemId: string,
  input: { tokens?: string[]; count?: number },
  db: Db = defaultDb,
) {
  assertAdmin(actor);
  const item = await db.query.orderItem.findFirst({
    where: eq(orderItem.id, orderItemId),
    with: { order: { columns: { id: true, userId: true, reference: true } }, cards: { columns: { id: true } } },
  });
  if (!item) throw new NotFoundError("Order line not found.");
  const outstanding = item.quantity - item.cards.length;
  const tokens = (input.tokens ?? []).map((t) => t.trim().match(/([A-Za-z0-9_-]{22})\s*$/)?.[1] ?? t.trim()).filter(Boolean);
  const wanted = tokens.length || input.count || outstanding;
  if (wanted < 1) throw new UserFacingError("This line already has all its cards.");
  if (wanted > outstanding) throw new UserFacingError(`This line needs ${outstanding} more ${outstanding === 1 ? "card" : "cards"}.`);

  const owner = item.order.userId ? await db.query.user.findFirst({ where: eq(user.id, item.order.userId) }) : null;
  const ownerProfile = owner ? await ensureOwnProfile(owner.id, owner.name, db) : null;

  return db.transaction(async (tx) => {
    const available = and(eq(card.status, "UNCLAIMED"), isNull(card.ownerId), isNull(card.orderItemId));
    const picked = tokens.length
      ? await tx.query.card.findMany({ where: and(inArray(card.token, tokens), available) })
      : await tx.query.card.findMany({ where: available, limit: wanted, orderBy: (c, { asc }) => [asc(c.createdAt)] });
    if (picked.length !== wanted) {
      throw new UserFacingError(
        tokens.length
          ? "Some of those cards don't exist or are already claimed or assigned. Check the list."
          : `Only ${picked.length} unclaimed cards are in stock. Create a batch first.`,
      );
    }
    const now = new Date();
    for (const c of picked) {
      await tx
        .update(card)
        .set(ownerProfile && owner ? { orderItemId, ownerId: owner.id, profileId: ownerProfile.id, status: "ACTIVE", claimedAt: now } : { orderItemId })
        .where(eq(card.id, c.id));
      if (owner && ownerProfile) {
        await tx.insert(cardAssignment).values({ cardId: c.id, userId: owner.id, profileId: ownerProfile.id, method: "order", assignedById: actor.id });
      }
    }
    await recordAudit(tx, actor, "order.assign_cards", { type: "order", id: item.order.id }, { orderItemId, cards: item.cards.length }, {
      orderItemId,
      cards: item.cards.length + picked.length,
      tokens: picked.map((c) => c.token),
      activatedFor: owner?.id ?? null,
    });
    return { assigned: picked.map((c) => c.token), activated: Boolean(owner) };
  });
}

export async function orderCounts(actor: AdminActor, db: Db = defaultDb) {
  assertAdmin(actor);
  const rows = await db.select({ status: order.status, n: sql<number>`count(*)::int` }).from(order).groupBy(order.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<OrderStatus, number>>;
}
