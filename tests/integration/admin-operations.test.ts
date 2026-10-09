import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { artworkProof, auditEvent, card, cardBatch, order, orderItem, product, user } from "@/db/schema";
import {
  assignCardsToOrderItem,
  batchQrZip,
  createBatch,
  listAuditEvents,
  reassignCard,
  recordRefund,
  regenerateClaimCodes,
  releaseCard,
  reviewProof,
  setCardActive,
  setPrice,
} from "@/server/admin";
import { claimCard, resolveCardToken } from "@/server/cards";
import { getProduct } from "@/server/catalog";
import { SECRET, makeUser } from "./fixtures";

let admin: { id: string; role: string; twoFactorEnabled: boolean };

beforeAll(async () => {
  const u = await makeUser("Ada Admin");
  await db.update(user).set({ role: "admin", twoFactorEnabled: true }).where(eq(user.id, u.id));
  admin = { id: u.id, role: "admin", twoFactorEnabled: true };
});

function parseCsv(csv: string) {
  const [header, ...rows] = csv.trim().split("\r\n");
  const cols = header.split(",");
  return rows.map((r) => Object.fromEntries(r.split(",").map((v, i) => [cols[i], v])));
}

async function makeOrder(userId: string | null, quantity = 2, customised = false) {
  const [o] = await db
    .insert(order)
    .values({ reference: `TS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, userId, email: "o@example.com", currency: "GBP", subtotal: 4800, total: 4800, status: customised ? "AWAITING_PROOF" : "PAID" })
    .returning();
  const [item] = await db
    .insert(orderItem)
    .values({ orderId: o.id, productName: "Classic card", quantity, unitAmount: 2400, customisation: customised ? { printName: "X" } : null })
    .returning();
  return { orderId: o.id, itemId: item.id };
}

describe("card batches", () => {
  it("creates cards whose claim codes exist only in the one-time CSV", async () => {
    const { batchId, csv } = await createBatch(admin, { label: "Spring print run", quantity: 5 }, SECRET);
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(5);
    expect(Object.keys(rows[0])).toEqual(["token", "url", "claim_code", "qr_file"]);
    expect(rows[0].url).toBe(`http://localhost:3000/c/${rows[0].token}`);

    const stored = await db.query.card.findMany({ where: eq(card.batchId, batchId) });
    expect(stored).toHaveLength(5);
    for (const c of stored) expect(c.claimCodeHash).not.toContain(rows[0].claim_code.replace("-", ""));
    const u = await makeUser("Claimer");
    await expect(claimCard(u, rows[0].token, rows[0].claim_code, SECRET)).resolves.toBeTruthy();

    const audit = await db.query.auditEvent.findFirst({ where: eq(auditEvent.entityId, batchId) });
    expect(audit).toMatchObject({ action: "batch.create", actorId: admin.id });
  });

  it("rejects silly quantities", async () => {
    await expect(createBatch(admin, { label: "x", quantity: 0 }, SECRET)).rejects.toThrow(/quantity/);
    await expect(createBatch(admin, { label: "x", quantity: 5000 }, SECRET)).rejects.toThrow(/quantity/);
  });

  it("regenerating codes invalidates the old ones for unclaimed cards", async () => {
    const { batchId, csv } = await createBatch(admin, { label: "Lost CSV", quantity: 2 }, SECRET);
    const [old] = parseCsv(csv);
    const { csv: fresh } = await regenerateClaimCodes(admin, batchId, SECRET);
    const renewed = parseCsv(fresh).find((r) => r.token === old.token)!;
    const u = await makeUser("Late");
    await expect(claimCard(u, old.token, old.claim_code, SECRET)).rejects.toThrow();
    await expect(claimCard(u, old.token, renewed.claim_code, SECRET)).resolves.toBeTruthy();
  });

  it("exports a QR zip without claim codes", async () => {
    const { batchId } = await createBatch(admin, { label: "Zip", quantity: 3 }, SECRET);
    const result = await batchQrZip(admin, batchId);
    expect(result!.zip.byteLength).toBeGreaterThan(500);
    const { unzipSync, strFromU8 } = await import("fflate");
    const files = unzipSync(result!.zip);
    expect(Object.keys(files).filter((f) => f.endsWith(".svg"))).toHaveLength(3);
    expect(strFromU8(files["cards.csv"])).not.toContain("claim_code");
  });
});

describe("assigning cards to orders", () => {
  it("activates cards straight away for orders from an account", async () => {
    const buyer = await makeUser("Order Owner");
    await createBatch(admin, { label: "Stock", quantity: 4 }, SECRET);
    const { itemId } = await makeOrder(buyer.id, 2);
    const result = await assignCardsToOrderItem(admin, itemId, {});
    expect(result.assigned).toHaveLength(2);
    expect(result.activated).toBe(true);
    for (const token of result.assigned) {
      const c = await db.query.card.findFirst({ where: eq(card.token, token) });
      expect(c).toMatchObject({ ownerId: buyer.id, status: "ACTIVE", orderItemId: itemId });
      expect((await resolveCardToken(token)).kind).toBe("not-ready"); // profile not yet published
    }
    await expect(assignCardsToOrderItem(admin, itemId, {})).rejects.toThrow(/already has all its cards/);
  });

  it("links guest-order cards without activating them, so the buyer claims with the printed code", async () => {
    const { batchId, csv } = await createBatch(admin, { label: "Guest stock", quantity: 1 }, SECRET);
    void batchId;
    const [row] = parseCsv(csv);
    const { itemId } = await makeOrder(null, 1);
    const result = await assignCardsToOrderItem(admin, itemId, { tokens: [`http://localhost:3000/c/${row.token}`] });
    expect(result).toEqual({ assigned: [row.token], activated: false });
    expect((await db.query.card.findFirst({ where: eq(card.token, row.token) }))?.status).toBe("UNCLAIMED");
  });

  it("refuses cards that are already claimed", async () => {
    const { csv } = await createBatch(admin, { label: "Taken", quantity: 1 }, SECRET);
    const [row] = parseCsv(csv);
    await claimCard(await makeUser("Someone"), row.token, row.claim_code, SECRET);
    const { itemId } = await makeOrder(null, 1);
    await expect(assignCardsToOrderItem(admin, itemId, { tokens: [row.token] })).rejects.toThrow(/already claimed/);
  });
});

describe("card administration", () => {
  it("disables, reassigns and releases a card, each logged with before/after", async () => {
    const { csv } = await createBatch(admin, { label: "Admin ops", quantity: 1 }, SECRET);
    const [row] = parseCsv(csv);
    const first = await makeUser("First Owner");
    const { cardId } = await claimCard(first, row.token, row.claim_code, SECRET);

    await setCardActive(admin, cardId, false);
    expect((await resolveCardToken(row.token)).kind).toBe("inactive");

    const second = await makeUser("Second Owner");
    const secondEmail = (await db.query.user.findFirst({ where: eq(user.id, second.id) }))!.email;
    await reassignCard(admin, cardId, secondEmail);
    expect(await db.query.card.findFirst({ where: eq(card.id, cardId) })).toMatchObject({ ownerId: second.id, status: "ACTIVE" });
    await expect(reassignCard(admin, cardId, "nobody@nowhere.example")).rejects.toThrow(/No customer/);

    const { claimCode } = await releaseCard(admin, cardId, SECRET);
    expect((await resolveCardToken(row.token)).kind).toBe("unclaimed");
    const third = await makeUser("Third");
    await expect(claimCard(third, row.token, row.claim_code, SECRET)).rejects.toThrow(); // old code no longer works
    await expect(claimCard(third, row.token, claimCode, SECRET)).resolves.toBeTruthy();

    const events = await listAuditEvents(admin, { entityType: "card", entityId: cardId });
    expect(events.map((e) => e.action).sort()).toEqual(["card.disable", "card.reassign", "card.release"]);
    const disable = events.find((e) => e.action === "card.disable")!;
    expect(disable.before).toMatchObject({ status: "ACTIVE" });
    expect(disable.after).toMatchObject({ status: "DEACTIVATED" });
  });
});

describe("refunds and proofs", () => {
  it("records refunds up to the order total and updates the status", async () => {
    const { orderId } = await makeOrder(null, 2);
    await recordRefund(admin, orderId, { amount: 1000, stripeRefundId: "re_123" });
    expect((await db.query.order.findFirst({ where: eq(order.id, orderId) }))?.status).toBe("PARTIALLY_REFUNDED");
    await expect(recordRefund(admin, orderId, { amount: 9999 })).rejects.toThrow(/more than is left/);
    await expect(recordRefund(admin, orderId, { amount: 100, stripeRefundId: "nope" })).rejects.toThrow(/re_/);
    await recordRefund(admin, orderId, { amount: 3800 });
    expect((await db.query.order.findFirst({ where: eq(order.id, orderId) }))?.status).toBe("REFUNDED");
  });

  it("moves the order to production once every proof is approved; rejections need a reason", async () => {
    const { orderId, itemId } = await makeOrder(null, 1, true);
    const [p1] = await db.insert(artworkProof).values({ orderItemId: itemId, fileKey: null }).returning();
    const [p2] = await db.insert(artworkProof).values({ orderItemId: itemId, fileKey: null }).returning();
    await expect(reviewProof(admin, p1.id, "REJECTED", "  ")).rejects.toThrow(/Say what needs to change/);
    expect((await reviewProof(admin, p1.id, "APPROVED", "")).movedToProduction).toBe(false);
    expect((await reviewProof(admin, p2.id, "APPROVED", "")).movedToProduction).toBe(true);
    expect((await db.query.order.findFirst({ where: eq(order.id, orderId) }))?.status).toBe("IN_PRODUCTION");
  });
});

describe("catalogue", () => {
  it("price changes show up in the shop straight away", async () => {
    const [p] = await db.insert(product).values({ slug: `admin-price-${Date.now()}`, name: "P", description: "d" }).returning();
    await setPrice(admin, p.id, null, "USD", 3100);
    expect((await getProduct(p.slug, "USD"))?.basePrice).toBe(3100);
    await setPrice(admin, p.id, null, "USD", null);
    expect((await getProduct(p.slug, "USD"))?.basePrice).toBeNull();
    await expect(setPrice(admin, p.id, null, "USD", -5)).rejects.toThrow();
  });
});

describe("batch rows are tied to the creating admin", () => {
  it("records the creator", async () => {
    const { batchId } = await createBatch(admin, { label: "Who", quantity: 1 }, SECRET);
    expect((await db.query.cardBatch.findFirst({ where: eq(cardBatch.id, batchId) }))?.createdById).toBe(admin.id);
  });
});
