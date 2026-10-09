import "server-only";
import { randomInt } from "node:crypto";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  type Currency,
  currencyInfo,
  formatMoney,
  isCurrency,
  shippingCountries,
  shippingRates,
  stripeTaxEnabled,
} from "@/config/commerce";
import { env } from "@/config/env";
import type { Db } from "@/db";
import { db as defaultDb } from "@/db";
import { type CheckoutSnapshotLine, artworkProof, checkoutSession, order, orderItem, productOption, stripeEvent } from "@/db/schema";
import { clearCart, getCartView } from "./cart";
import { sendEmail } from "./email";
import { orderConfirmationMessage } from "./email/templates";
import { NotFoundError, UserFacingError } from "./errors";
import type { PaymentEvent, PaymentProvider } from "./payments/types";

const REF_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
export function generateOrderReference() {
  let ref = "";
  for (let i = 0; i < 6; i++) ref += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `TS-${ref}`;
}

function describeLine(line: Pick<CheckoutSnapshotLine, "productName" | "optionName">) {
  return line.optionName ? `${line.productName}, ${line.optionName}` : line.productName;
}

function customisationSummary(c: CheckoutSnapshotLine["customisation"]) {
  if (!c) return undefined;
  const parts = [c.printName && `Name: ${c.printName}`, c.printTitle && `Title: ${c.printTitle}`, c.artworkKey && "Logo: uploaded (proof to follow)"];
  return parts.filter(Boolean).join(" · ") || undefined;
}

// ---------------------------------------------------------------------------
// Starting checkout
// ---------------------------------------------------------------------------

export async function startCheckout(
  args: { cartId: string; currency: Currency; user: { id: string; email: string } | null; provider: PaymentProvider },
  db: Db = defaultDb,
): Promise<{ url: string }> {
  const cart = await getCartView(args.cartId, args.currency, db);
  if (!cart || cart.lines.length === 0) throw new UserFacingError("Your basket is empty.");
  if (!cart.purchasable) throw new UserFacingError("Some items in your basket aren't available in this currency or are out of stock. Remove them to continue.");

  const lines: CheckoutSnapshotLine[] = cart.lines.map((l) => ({
    productId: l.productId,
    optionId: l.optionId,
    productName: l.productName,
    optionName: l.optionName,
    quantity: l.quantity,
    unitAmount: l.unitAmount!,
    customisation: l.customisation,
  }));

  const attemptId = crypto.randomUUID();
  const created = await args.provider.createCheckout({
    attemptId,
    currency: args.currency,
    lines: lines.map((l) => ({ name: describeLine(l), description: customisationSummary(l.customisation), unitAmount: l.unitAmount, quantity: l.quantity })),
    shippingRates: shippingRates[args.currency],
    allowedCountries: shippingCountries[args.currency],
    customerEmail: args.user?.email,
    taxEnabled: stripeTaxEnabled(),
    taxInclusive: currencyInfo[args.currency].taxInclusive,
    successUrl: `${env.appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${env.appUrl}/cart?cancelled=1`,
  });

  await db.insert(checkoutSession).values({
    id: created.sessionId,
    provider: args.provider.name,
    cartId: args.cartId,
    userId: args.user?.id ?? null,
    currency: args.currency,
    lines,
    subtotal: cart.subtotal,
  });

  // The simulated provider can't substitute the session id into the success URL itself.
  return { url: created.url };
}

// ---------------------------------------------------------------------------
// Webhook processing: the only place orders are created
// ---------------------------------------------------------------------------

export type ProcessResult = { status: "created" | "duplicate" | "ignored" | "pending" | "updated"; orderId?: string };

async function fulfilFromSnapshot(
  tx: Parameters<Parameters<Db["transaction"]>[0]>[0],
  snapshot: typeof checkoutSession.$inferSelect,
  event: Extract<PaymentEvent, { kind: "checkout.completed" }>,
) {
  const existing = await tx.query.order.findFirst({ where: eq(order.stripeCheckoutSessionId, snapshot.id), columns: { id: true } });
  if (existing) return { orderId: existing.id, created: false };

  const currency = isCurrency(event.currency) ? event.currency : snapshot.currency;
  const needsProof = snapshot.lines.some((l) => l.customisation?.artworkKey || l.customisation?.printName || l.customisation?.printTitle);
  const notes =
    event.amountSubtotal !== snapshot.subtotal
      ? `Subtotal mismatch: checkout snapshot ${snapshot.subtotal}, provider reported ${event.amountSubtotal}. Check before fulfilling.`
      : null;
  if (notes) console.warn(`[orders] ${notes} (session ${snapshot.id})`);

  let reference = generateOrderReference();
  for (let i = 0; i < 5 && (await tx.query.order.findFirst({ where: eq(order.reference, reference), columns: { id: true } })); i++) {
    reference = generateOrderReference();
  }

  const [created] = await tx
    .insert(order)
    .values({
      reference,
      userId: snapshot.userId,
      email: event.email ?? "",
      currency,
      subtotal: event.amountSubtotal,
      shipping: event.amountShipping,
      tax: event.amountTax,
      total: event.amountTotal,
      status: needsProof ? "AWAITING_PROOF" : "PAID",
      stripeCheckoutSessionId: snapshot.id,
      stripePaymentIntentId: event.paymentIntentId,
      shippingName: event.shippingName,
      shippingAddress: event.shippingAddress,
      notes,
    })
    .returning();

  for (const line of snapshot.lines) {
    const [item] = await tx
      .insert(orderItem)
      .values({
        orderId: created.id,
        productId: line.productId,
        optionId: line.optionId,
        productName: line.productName,
        optionName: line.optionName,
        quantity: line.quantity,
        unitAmount: line.unitAmount,
        customisation: line.customisation,
      })
      .returning({ id: orderItem.id });
    if (line.customisation?.artworkKey) {
      await tx.insert(artworkProof).values({ orderItemId: item.id, fileKey: line.customisation.artworkKey });
    }
    if (line.optionId) {
      // Tracked stock only (inventory not null); never below zero.
      await tx
        .update(productOption)
        .set({ inventory: sql`GREATEST(${productOption.inventory} - ${line.quantity}, 0)` })
        .where(and(eq(productOption.id, line.optionId), gte(productOption.inventory, 0)));
    }
  }

  await tx.update(checkoutSession).set({ status: "completed", orderId: created.id }).where(eq(checkoutSession.id, snapshot.id));
  if (snapshot.cartId) await clearCart(snapshot.cartId, tx as unknown as Db);
  return { orderId: created.id, created: true };
}

async function sendConfirmation(orderId: string, db: Db) {
  const o = await db.query.order.findFirst({ where: eq(order.id, orderId), with: { items: true } });
  if (!o || !o.email) return;
  const c = o.currency as Currency;
  await sendEmail(
    orderConfirmationMessage(o.email, {
      reference: o.reference,
      lines: o.items.map((i) => ({ name: describeLine(i), quantity: i.quantity, amount: formatMoney(i.unitAmount * i.quantity, c) })),
      subtotal: formatMoney(o.subtotal, c),
      shipping: o.shipping === 0 ? "Free" : formatMoney(o.shipping, c),
      tax: o.tax ? formatMoney(o.tax, c) : null,
      total: formatMoney(o.total, c),
      needsProof: o.status === "AWAITING_PROOF",
      ordersUrl: o.userId ? `${env.appUrl}/dashboard/orders/${o.reference}` : null,
    }),
  ).catch((error: unknown) => console.error("[orders] confirmation email failed:", error instanceof Error ? error.message : error));
}

/**
 * Applies a verified payment event exactly once. The event id is recorded in
 * the same transaction as its effects, so a retried or replayed webhook is a
 * no-op, and a failure part-way rolls everything back for the provider to retry.
 */
export async function processPaymentEvent(event: PaymentEvent, db: Db = defaultDb): Promise<ProcessResult> {
  const result = await db.transaction(async (tx): Promise<ProcessResult & { sendEmailFor?: string }> => {
    const inserted = await tx
      .insert(stripeEvent)
      .values({ id: event.eventId, type: event.kind })
      .onConflictDoNothing()
      .returning({ id: stripeEvent.id });
    if (inserted.length === 0) return { status: "duplicate" };
    if (event.kind === "ignored") return { status: "ignored" };

    const snapshot = await tx.query.checkoutSession.findFirst({ where: eq(checkoutSession.id, event.sessionId) });
    if (!snapshot) {
      // Not one of ours (or created before this table existed). Nothing to do, but worth knowing about.
      console.warn(`[orders] payment event ${event.kind} for unknown checkout session ${event.sessionId}`);
      return { status: "ignored" };
    }

    switch (event.kind) {
      case "checkout.completed": {
        if (!event.paid) {
          // e.g. bank debits: wait for the async success event.
          await tx.update(checkoutSession).set({ status: "awaiting_payment" }).where(eq(checkoutSession.id, snapshot.id));
          return { status: "pending" };
        }
        const { orderId, created } = await fulfilFromSnapshot(tx, snapshot, event);
        return created ? { status: "created", orderId, sendEmailFor: orderId } : { status: "duplicate", orderId };
      }
      case "checkout.payment_failed":
      case "checkout.expired":
        await tx.update(checkoutSession).set({ status: "expired" }).where(and(eq(checkoutSession.id, snapshot.id), eq(checkoutSession.status, "open")));
        return { status: "updated" };
    }
  });

  if (result.sendEmailFor) await sendConfirmation(result.sendEmailFor, db);
  return { status: result.status, orderId: result.orderId };
}

// ---------------------------------------------------------------------------
// Reading orders
// ---------------------------------------------------------------------------

export async function listOwnOrders(userId: string, db: Db = defaultDb) {
  return db.query.order.findMany({
    where: eq(order.userId, userId),
    orderBy: [desc(order.createdAt)],
    columns: { id: true, reference: true, status: true, currency: true, total: true, createdAt: true },
    with: { items: { columns: { quantity: true } } },
  });
}

export async function getOwnOrder(userId: string, reference: string, db: Db = defaultDb) {
  if (!/^TS-[A-Z0-9]{6}$/.test(reference)) throw new NotFoundError("We couldn't find that order.");
  const row = await db.query.order.findFirst({
    where: and(eq(order.userId, userId), eq(order.reference, reference)),
    with: { items: { with: { proofs: { columns: { status: true, reviewNotes: true } } } }, refunds: true },
  });
  if (!row) throw new NotFoundError("We couldn't find that order.");
  return row;
}

/** For the success page: only reveals the order to whoever started that checkout (same cart cookie or same user). */
export async function getCheckoutOutcome(sessionId: string, viewer: { userId: string | null; cartId: string | null }, db: Db = defaultDb) {
  if (!/^(cs_|sim_cs_)[A-Za-z0-9_]{8,200}$/.test(sessionId)) return null;
  const snapshot = await db.query.checkoutSession.findFirst({
    where: eq(checkoutSession.id, sessionId),
    with: { order: { columns: { reference: true, email: true, status: true } } },
  });
  if (!snapshot) return null;
  const allowed = (viewer.userId && snapshot.userId === viewer.userId) || (viewer.cartId && snapshot.cartId === viewer.cartId);
  if (!allowed) return null;
  return { status: snapshot.status, order: snapshot.order ?? null, signedIn: Boolean(snapshot.userId) };
}
