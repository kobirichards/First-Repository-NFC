import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/db";
import { db as defaultDb } from "@/db";
import { card, cardAssignment, order, profile, session, user } from "@/db/schema";
import { getStorage } from "./storage";

/**
 * Everything we hold about the user, for "Download my data".
 * Excludes secrets: password hashes, session tokens, claim-code hashes, 2FA secrets.
 */
export async function exportUserData(userId: string, db: Db = defaultDb) {
  const [account, ownProfile, cards, orders, sessions] = await Promise.all([
    db.query.user.findFirst({
      where: eq(user.id, userId),
      columns: { id: true, name: true, email: true, emailVerified: true, createdAt: true, updatedAt: true, twoFactorEnabled: true },
    }),
    db.query.profile.findFirst({ where: eq(profile.userId, userId) }),
    db.query.card.findMany({
      where: eq(card.ownerId, userId),
      columns: { id: true, token: true, label: true, status: true, destination: true, claimedAt: true, deactivatedAt: true, createdAt: true },
    }),
    db.query.order.findMany({ where: eq(order.userId, userId), with: { items: true } }),
    db.query.session.findMany({
      where: eq(session.userId, userId),
      columns: { createdAt: true, updatedAt: true, expiresAt: true, ipAddress: true, userAgent: true },
    }),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    account,
    profile: ownProfile ?? null,
    cards,
    orders,
    activeSessions: sessions,
  };
}

/**
 * Runs before Better Auth deletes the user. Cards are physical objects that
 * outlive the account, so they are deactivated and detached rather than
 * deleted; the profile, sessions and cart are removed by cascade; orders are
 * kept (without the user link) for accounting, as the privacy policy explains.
 */
export async function prepareAccountDeletion(userId: string, db: Db = defaultDb) {
  const ownProfile = await db.query.profile.findFirst({ where: eq(profile.userId, userId), columns: { photoKey: true } });
  await db.transaction(async (tx) => {
    const now = new Date();
    await tx
      .update(card)
      .set({ status: "DEACTIVATED", deactivatedAt: now, ownerId: null, profileId: null, label: null })
      .where(eq(card.ownerId, userId));
    await tx.update(cardAssignment).set({ endedAt: now }).where(and(eq(cardAssignment.userId, userId), isNull(cardAssignment.endedAt)));
  });
  if (ownProfile?.photoKey) await getStorage().delete(ownProfile.photoKey).catch(() => undefined);
}
