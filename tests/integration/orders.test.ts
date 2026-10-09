import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { beforeAll, describe, expect, it } from "vitest";
import { POST as stripeWebhook } from "@/app/api/webhooks/stripe/route";
import { db } from "@/db";
import { artworkProof, cartItem, checkoutSession, order, price, product, productOption } from "@/db/schema";
import { addToCart, createCart, getCartView } from "@/server/cart";
import { getCheckoutOutcome, getOwnOrder, processPaymentEvent, startCheckout } from "@/server/orders";
import { StripeProvider } from "@/server/payments/stripe";
import type { CheckoutRequest, PaymentEvent, PaymentProvider } from "@/server/payments/types";
import { WebhookVerificationError } from "@/server/payments/types";
import { makeUser } from "./fixtures";

const WEBHOOK_SECRET = "whsec_test_integration";

/** Records what would be sent to Stripe instead of calling it. */
class RecordingProvider implements PaymentProvider {
  readonly name = "simulated" as const;
  requests: CheckoutRequest[] = [];
  async createCheckout(request: CheckoutRequest) {
    this.requests.push(request);
    return { sessionId: `cs_test_${request.attemptId.replace(/-/g, "")}`, url: "https://checkout.example/session" };
  }
}

let classicId: string;
let blackId: string;
let gbpOnlyId: string;
let stockedOptionId: string;

beforeAll(async () => {
  const [classic] = await db.insert(product).values({ slug: `classic-${Date.now()}`, name: "Classic card", description: "x", customisable: true }).returning();
  classicId = classic.id;
  const [black] = await db.insert(productOption).values({ productId: classic.id, slug: "black", name: "Matte black", inventory: 10 }).returning();
  blackId = black.id;
  stockedOptionId = black.id;
  await db.insert(price).values([
    { productId: classic.id, currency: "GBP", amount: 2400 },
    { productId: classic.id, currency: "EUR", amount: 2800 },
    { productId: classic.id, currency: "USD", amount: 2900 },
  ]);
  const [gbpOnly] = await db.insert(product).values({ slug: `uk-only-${Date.now()}`, name: "UK only", description: "x" }).returning();
  gbpOnlyId = gbpOnly.id;
  await db.insert(price).values({ productId: gbpOnly.id, currency: "GBP", amount: 1000 });
});

function completedEvent(sessionId: string, overrides: Partial<Extract<PaymentEvent, { kind: "checkout.completed" }>> = {}): PaymentEvent {
  return {
    kind: "checkout.completed",
    eventId: `evt_${crypto.randomUUID().replace(/-/g, "")}`,
    sessionId,
    paid: true,
    paymentIntentId: "pi_123",
    email: "buyer@example.com",
    currency: "GBP",
    amountSubtotal: 4800,
    amountShipping: 0,
    amountTax: 800,
    amountTotal: 4800,
    shippingName: "Buyer",
    shippingAddress: { line1: "1 Street", line2: null, city: "London", state: null, postalCode: "N12", country: "GB" },
    ...overrides,
  };
}

async function cartWith(items: Array<Parameters<typeof addToCart>[1]>, userId: string | null = null) {
  const cartId = await createCart(userId, "GBP");
  for (const item of items) await addToCart(cartId, item);
  return cartId;
}

describe("pricing", () => {
  it("prices the same cart in each currency from the fixed price list", async () => {
    const cartId = await cartWith([{ productId: classicId, optionId: blackId, quantity: 2 }]);
    expect((await getCartView(cartId, "GBP"))?.subtotal).toBe(4800);
    expect((await getCartView(cartId, "EUR"))?.subtotal).toBe(5600);
    expect((await getCartView(cartId, "USD"))?.subtotal).toBe(5800);
  });

  it("merges identical plain items and keeps customised ones separate", async () => {
    const cartId = await cartWith([
      { productId: classicId, optionId: blackId, quantity: 1 },
      { productId: classicId, optionId: blackId, quantity: 2 },
      { productId: classicId, optionId: blackId, quantity: 1, customisation: { printName: "Ana" } },
    ]);
    const view = await getCartView(cartId, "GBP");
    expect(view?.lines.map((l) => l.quantity).sort()).toEqual([1, 3]);
  });

  it("caps the number of separate lines in one basket", async () => {
    const cartId = await createCart(null, "GBP");
    for (let i = 0; i < 20; i++) {
      await addToCart(cartId, { productId: classicId, optionId: blackId, quantity: 1, customisation: { printName: `Person ${i}` } });
    }
    await expect(
      addToCart(cartId, { productId: classicId, optionId: blackId, quantity: 1, customisation: { printName: "One too many" } }),
    ).rejects.toThrow(/up to 20 different items/);
    expect((await getCartView(cartId, "GBP"))?.lines).toHaveLength(20);
  });

  it("requires a finish when the product has options, and rejects options from other products", async () => {
    const cartId = await createCart(null, "GBP");
    await expect(addToCart(cartId, { productId: classicId, quantity: 1 })).rejects.toThrow(/Choose a finish/);
    await expect(addToCart(cartId, { productId: gbpOnlyId, optionId: blackId, quantity: 1 })).rejects.toThrow(/finish isn't available/);
  });

  it("won't start checkout for items not sold in the visitor's currency", async () => {
    const cartId = await cartWith([{ productId: gbpOnlyId, quantity: 1 }]);
    expect((await getCartView(cartId, "USD"))?.purchasable).toBe(false);
    await expect(startCheckout({ cartId, currency: "USD", user: null, provider: new RecordingProvider() })).rejects.toThrow(/aren't available/);
  });
});

describe("checkout and webhook processing", () => {
  it("sends the right line items, shipping and tax settings to the provider", async () => {
    const provider = new RecordingProvider();
    const cartId = await cartWith([{ productId: classicId, optionId: blackId, quantity: 2, customisation: { printName: "Ana Lima" } }]);
    await startCheckout({ cartId, currency: "EUR", user: null, provider });
    const req = provider.requests[0];
    expect(req.currency).toBe("EUR");
    expect(req.lines).toEqual([{ name: "Classic card, Matte black", description: "Name: Ana Lima", unitAmount: 2800, quantity: 2 }]);
    expect(req.taxInclusive).toBe(true);
    expect(req.allowedCountries).toContain("FR");
    expect(req.successUrl).toContain("{CHECKOUT_SESSION_ID}");
  });

  it("creates exactly one order from a verified completion, even when the event is replayed", async () => {
    const buyer = await makeUser("Bea Buyer");
    const provider = new RecordingProvider();
    const cartId = await cartWith(
      [
        { productId: classicId, optionId: blackId, quantity: 1 },
        {
          productId: classicId,
          optionId: blackId,
          quantity: 1,
          customisation: { printName: "Bea", artworkKey: "artwork/00000000-0000-4000-8000-000000000000.png" },
        },
      ],
      buyer.id,
    );
    await startCheckout({ cartId, currency: "GBP", user: { id: buyer.id, email: "bea@example.com" }, provider });
    const sessionId = (await db.query.checkoutSession.findFirst({ where: eq(checkoutSession.cartId, cartId) }))!.id;

    // No order exists until the webhook arrives.
    expect(await db.query.order.findFirst({ where: eq(order.stripeCheckoutSessionId, sessionId) })).toBeUndefined();

    const event = completedEvent(sessionId);
    const first = await processPaymentEvent(event);
    expect(first.status).toBe("created");
    expect((await processPaymentEvent(event)).status).toBe("duplicate"); // same event replayed
    expect((await processPaymentEvent(completedEvent(sessionId))).status).toBe("duplicate"); // new event, same session

    const orders = await db.query.order.findMany({ where: eq(order.stripeCheckoutSessionId, sessionId), with: { items: true } });
    expect(orders).toHaveLength(1);
    const o = orders[0];
    expect(o).toMatchObject({ userId: buyer.id, currency: "GBP", subtotal: 4800, tax: 800, total: 4800, status: "AWAITING_PROOF", email: "buyer@example.com" });
    expect(o.reference).toMatch(/^TS-[A-Z0-9]{6}$/);
    expect(o.items).toHaveLength(2);
    expect(o.notes).toBeNull();

    // Proof queued for the logo; stock decremented; cart emptied; snapshot linked.
    const proofs = await db.query.artworkProof.findMany({ where: eq(artworkProof.orderItemId, o.items.find((i) => i.customisation?.artworkKey)!.id) });
    expect(proofs).toHaveLength(1);
    expect((await db.query.productOption.findFirst({ where: eq(productOption.id, stockedOptionId) }))!.inventory).toBeLessThanOrEqual(8);
    expect(await db.query.cartItem.findMany({ where: eq(cartItem.cartId, cartId) })).toHaveLength(0);
    expect((await db.query.checkoutSession.findFirst({ where: eq(checkoutSession.id, sessionId) }))!.status).toBe("completed");

    // Owner can read it; another user can't.
    expect((await getOwnOrder(buyer.id, o.reference)).id).toBe(o.id);
    const other = await makeUser("Other");
    await expect(getOwnOrder(other.id, o.reference)).rejects.toThrow(/couldn't find/);

    // Success page: visible to the buyer's cart or account only.
    expect((await getCheckoutOutcome(sessionId, { userId: buyer.id, cartId: null }))?.order?.reference).toBe(o.reference);
    expect(await getCheckoutOutcome(sessionId, { userId: other.id, cartId: crypto.randomUUID() })).toBeNull();
  });

  it("flags a subtotal mismatch for review instead of trusting it silently", async () => {
    const cartId = await cartWith([{ productId: classicId, optionId: blackId, quantity: 1 }]);
    await startCheckout({ cartId, currency: "GBP", user: null, provider: new RecordingProvider() });
    const sessionId = (await db.query.checkoutSession.findFirst({ where: eq(checkoutSession.cartId, cartId) }))!.id;
    const result = await processPaymentEvent(completedEvent(sessionId, { amountSubtotal: 100, amountTotal: 100 }));
    const o = await db.query.order.findFirst({ where: eq(order.id, result.orderId!) });
    expect(o?.notes).toMatch(/Subtotal mismatch/);
  });

  it("waits for delayed payments and handles expiry", async () => {
    const cartId = await cartWith([{ productId: classicId, optionId: blackId, quantity: 1 }]);
    await startCheckout({ cartId, currency: "GBP", user: null, provider: new RecordingProvider() });
    const sessionId = (await db.query.checkoutSession.findFirst({ where: eq(checkoutSession.cartId, cartId) }))!.id;
    expect((await processPaymentEvent(completedEvent(sessionId, { paid: false, amountSubtotal: 2400 }))).status).toBe("pending");
    expect(await db.query.order.findFirst({ where: eq(order.stripeCheckoutSessionId, sessionId) })).toBeUndefined();
    expect((await processPaymentEvent(completedEvent(sessionId, { amountSubtotal: 2400 }))).status).toBe("created");

    const cart2 = await cartWith([{ productId: classicId, optionId: blackId, quantity: 1 }]);
    await startCheckout({ cartId: cart2, currency: "GBP", user: null, provider: new RecordingProvider() });
    const s2 = (await db.query.checkoutSession.findFirst({ where: eq(checkoutSession.cartId, cart2) }))!.id;
    await processPaymentEvent({ kind: "checkout.expired", eventId: `evt_${crypto.randomUUID()}`, sessionId: s2 });
    expect((await db.query.checkoutSession.findFirst({ where: eq(checkoutSession.id, s2) }))!.status).toBe("expired");
    expect(await db.query.cartItem.findMany({ where: eq(cartItem.cartId, cart2) })).toHaveLength(1); // basket kept
  });

  it("ignores events for sessions it didn't create", async () => {
    expect((await processPaymentEvent(completedEvent("cs_test_unknown"))).status).toBe("ignored");
  });
});

describe("Stripe webhook verification", () => {
  function stripeEventPayload(sessionId: string) {
    return JSON.stringify({
      id: `evt_${crypto.randomUUID().replace(/-/g, "")}`,
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: sessionId,
          object: "checkout.session",
          payment_status: "paid",
          payment_intent: "pi_abc",
          currency: "gbp",
          amount_subtotal: 2400,
          amount_total: 2400,
          total_details: { amount_shipping: 0, amount_tax: 400, amount_discount: 0 },
          customer_details: { email: "stripe-buyer@example.com", name: "Stripe Buyer" },
          collected_information: {
            shipping_details: { name: "Stripe Buyer", address: { line1: "2 Road", line2: null, city: "Leeds", state: null, postal_code: "LS1", country: "GB" } },
          },
        },
      },
    });
  }

  it("accepts a correctly signed event and maps it", () => {
    const payload = stripeEventPayload("cs_test_map");
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
    const event = StripeProvider.verifyWebhook(payload, header, WEBHOOK_SECRET);
    expect(event).toMatchObject({
      kind: "checkout.completed",
      sessionId: "cs_test_map",
      paid: true,
      email: "stripe-buyer@example.com",
      currency: "GBP",
      amountTax: 400,
      shippingAddress: { city: "Leeds", postalCode: "LS1", country: "GB" },
    });
  });

  it.each([
    ["a tampered body", (p: string, h: string) => [p.replace("2400", "1"), h]],
    ["a missing signature", (p: string) => [p, null]],
    ["a signature from another secret", (p: string) => [p, Stripe.webhooks.generateTestHeaderString({ payload: p, secret: "whsec_other" })]],
  ] as const)("rejects %s", (_label, mutate) => {
    const payload = stripeEventPayload("cs_test_bad");
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
    const [body, sig] = mutate(payload, header);
    expect(() => StripeProvider.verifyWebhook(body as string, sig as string | null, WEBHOOK_SECRET)).toThrow(WebhookVerificationError);
  });

  it("the webhook route returns 400 for bad signatures and creates the order for good ones", async () => {
    process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
    const cartId = await cartWith([{ productId: classicId, optionId: blackId, quantity: 1 }]);
    await startCheckout({ cartId, currency: "GBP", user: null, provider: new RecordingProvider() });
    const sessionId = (await db.query.checkoutSession.findFirst({ where: eq(checkoutSession.cartId, cartId) }))!.id;
    const payload = stripeEventPayload(sessionId);

    const bad = await stripeWebhook(
      new Request("http://test/api/webhooks/stripe", { method: "POST", body: payload, headers: { "stripe-signature": "t=1,v1=nope" } }) as never,
    );
    expect(bad.status).toBe(400);
    expect(await db.query.order.findFirst({ where: eq(order.stripeCheckoutSessionId, sessionId) })).toBeUndefined();

    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
    const good = await stripeWebhook(
      new Request("http://test/api/webhooks/stripe", { method: "POST", body: payload, headers: { "stripe-signature": header } }) as never,
    );
    expect(good.status).toBe(200);
    expect(await good.json()).toMatchObject({ received: true, status: "created" });
    const created = await db.query.order.findFirst({ where: eq(order.stripeCheckoutSessionId, sessionId) });
    expect(created).toMatchObject({ email: "stripe-buyer@example.com", tax: 400, shippingName: "Stripe Buyer" });
  });
});
