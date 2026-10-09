import "server-only";
import { and, eq, isNull, lt, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { db as defaultDb } from "@/db";
import { artworkProof, cart, cartItem, checkoutSession, profile } from "@/db/schema";
import { getStorage, type ObjectStorage } from "./storage";

const DAY = 24 * 60 * 60 * 1000;

/**
 * Housekeeping, safe to run daily (`npm run cleanup`):
 * - expires checkout sessions left open for over 2 days (Stripe expires them after 24 h anyway)
 * - deletes anonymous carts untouched for 30 days
 * - deletes uploaded logos older than 7 days that no basket line or order proof refers to
 * - deletes profile photos older than 1 day that no profile refers to (left over from failed saves)
 */
export async function runCleanup(now = new Date(), db: Db = defaultDb, storage: ObjectStorage = getStorage()) {
  const expired = await db
    .update(checkoutSession)
    .set({ status: "expired" })
    .where(and(eq(checkoutSession.status, "open"), lt(checkoutSession.createdAt, new Date(now.getTime() - 2 * DAY))))
    .returning({ id: checkoutSession.id });

  const carts = await db
    .delete(cart)
    .where(and(isNull(cart.userId), lt(cart.updatedAt, new Date(now.getTime() - 30 * DAY))))
    .returning({ id: cart.id });

  const referencedArtwork = new Set<string>();
  for (const row of await db.select({ c: cartItem.customisation }).from(cartItem).where(sql`${cartItem.customisation} ->> 'artworkKey' IS NOT NULL`)) {
    if (row.c?.artworkKey) referencedArtwork.add(row.c.artworkKey);
  }
  for (const row of await db.select({ k: artworkProof.fileKey }).from(artworkProof)) if (row.k) referencedArtwork.add(row.k);
  for (const row of await db.select({ lines: checkoutSession.lines }).from(checkoutSession).where(eq(checkoutSession.status, "open"))) {
    for (const l of row.lines) if (l.customisation?.artworkKey) referencedArtwork.add(l.customisation.artworkKey);
  }
  let artworkDeleted = 0;
  for (const o of await storage.list("artwork/")) {
    if (!referencedArtwork.has(o.key) && o.lastModified.getTime() < now.getTime() - 7 * DAY) {
      await storage.delete(o.key);
      artworkDeleted++;
    }
  }

  const referencedPhotos = new Set((await db.select({ k: profile.photoKey }).from(profile)).map((r) => r.k).filter(Boolean));
  let photosDeleted = 0;
  for (const o of await storage.list("profile/")) {
    if (!referencedPhotos.has(o.key) && o.lastModified.getTime() < now.getTime() - DAY) {
      await storage.delete(o.key);
      photosDeleted++;
    }
  }

  return { checkoutSessionsExpired: expired.length, cartsDeleted: carts.length, artworkDeleted, photosDeleted };
}

