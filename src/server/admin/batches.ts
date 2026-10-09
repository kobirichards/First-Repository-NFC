import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { strToU8, zipSync } from "fflate";
import type { Db } from "@/db";
import { db as defaultDb } from "@/db";
import { card, cardBatch } from "@/db/schema";
import { toCsv } from "@/lib/csv";
import { UserFacingError } from "../errors";
import { cardUrl } from "../links";
import { qrSvg } from "../qr";
import { generateCardToken, generateClaimCode, hashClaimCode } from "../cards/tokens";
import { recordAudit } from "./audit";
import { type AdminActor, assertAdmin } from "./guard";

export const MAX_BATCH_SIZE = 1000;

const qrFilename = (token: string) => `qr/${token}.svg`;

function printerCsv(rows: Array<{ token: string; claimCode: string }>) {
  return toCsv(
    ["token", "url", "claim_code", "qr_file"],
    rows.map((r) => [r.token, cardUrl(r.token), r.claimCode, qrFilename(r.token)]),
  );
}

/**
 * Creates a batch of unclaimed cards for the printer. Returns the CSV with
 * plain claim codes: this is the ONLY time they exist, since only their
 * HMAC is stored. If it's lost before printing, use regenerateClaimCodes.
 */
export async function createBatch(actor: AdminActor, input: { label: string; quantity: number }, secret: string, db: Db = defaultDb) {
  assertAdmin(actor);
  const label = input.label.trim();
  if (!label || label.length > 80) throw new UserFacingError("Give the batch a name of up to 80 characters.", "label");
  if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > MAX_BATCH_SIZE) {
    throw new UserFacingError(`Enter a quantity from 1 to ${MAX_BATCH_SIZE}.`, "quantity");
  }
  const rows = Array.from({ length: input.quantity }, () => ({ token: generateCardToken(), claimCode: generateClaimCode() }));
  const batchId = await db.transaction(async (tx) => {
    const [batch] = await tx.insert(cardBatch).values({ label, quantity: input.quantity, createdById: actor.id, exportedAt: new Date() }).returning();
    await tx.insert(card).values(rows.map((r) => ({ token: r.token, claimCodeHash: hashClaimCode(r.claimCode, secret), batchId: batch.id })));
    await recordAudit(tx, actor, "batch.create", { type: "card_batch", id: batch.id }, null, { label, quantity: input.quantity });
    return batch.id;
  });
  return { batchId, csv: printerCsv(rows), filename: `batch-${batchId.slice(0, 8)}-with-claim-codes.csv` };
}

/** New claim codes for every still-unclaimed card in a batch. Codes already printed stop working. */
export async function regenerateClaimCodes(actor: AdminActor, batchId: string, secret: string, db: Db = defaultDb) {
  assertAdmin(actor);
  const cards = await db.query.card.findMany({
    where: and(eq(card.batchId, batchId), eq(card.status, "UNCLAIMED"), sql`${card.ownerId} IS NULL`),
    columns: { id: true, token: true },
  });
  if (cards.length === 0) throw new UserFacingError("This batch has no unclaimed cards.");
  const rows = cards.map((c) => ({ ...c, claimCode: generateClaimCode() }));
  await db.transaction(async (tx) => {
    for (const r of rows) await tx.update(card).set({ claimCodeHash: hashClaimCode(r.claimCode, secret) }).where(eq(card.id, r.id));
    await recordAudit(tx, actor, "batch.regenerate_codes", { type: "card_batch", id: batchId }, null, { cards: rows.length });
  });
  return { csv: printerCsv(rows), filename: `batch-${batchId.slice(0, 8)}-new-claim-codes.csv` };
}

export async function listBatches(actor: AdminActor, db: Db = defaultDb) {
  assertAdmin(actor);
  const batches = await db.query.cardBatch.findMany({
    orderBy: [desc(cardBatch.createdAt)],
    with: { createdBy: { columns: { email: true } } },
  });
  const counts = await db
    .select({ batchId: card.batchId, status: card.status, n: sql<number>`count(*)::int` })
    .from(card)
    .groupBy(card.batchId, card.status);
  return batches.map((b) => {
    const mine = counts.filter((c) => c.batchId === b.id);
    const count = (s: string) => mine.find((c) => c.status === s)?.n ?? 0;
    return { ...b, unclaimed: count("UNCLAIMED"), active: count("ACTIVE"), deactivated: count("DEACTIVATED") };
  });
}

/** Zip of one SVG QR code per card plus a CSV without claim codes. Safe to download any time. */
export async function batchQrZip(actor: AdminActor, batchId: string, db: Db = defaultDb) {
  assertAdmin(actor);
  const batch = await db.query.cardBatch.findFirst({ where: eq(cardBatch.id, batchId), with: { cards: { columns: { token: true } } } });
  if (!batch) return null;
  const files: Record<string, Uint8Array> = {
    "cards.csv": strToU8(toCsv(["token", "url", "qr_file"], batch.cards.map((c) => [c.token, cardUrl(c.token), qrFilename(c.token)]))),
  };
  for (const c of batch.cards) files[qrFilename(c.token)] = strToU8(await qrSvg(cardUrl(c.token)));
  return { zip: zipSync(files, { level: 6 }), filename: `batch-${batch.id.slice(0, 8)}-qr.zip` };
}
