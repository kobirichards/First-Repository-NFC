import "server-only";
import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import type { Db } from "@/db";
import { db as defaultDb } from "@/db";
import { card, cardAssignment, user } from "@/db/schema";
import { NotFoundError, UserFacingError } from "../errors";
import { ensureOwnProfile } from "../profiles";
import { generateClaimCode, hashClaimCode } from "../cards/tokens";
import { recordAudit } from "./audit";
import { type AdminActor, assertAdmin } from "./guard";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

const snapshot = (c: typeof card.$inferSelect) => ({
  status: c.status,
  ownerId: c.ownerId,
  profileId: c.profileId,
  destination: c.destination,
  orderItemId: c.orderItemId,
});

export async function searchCards(actor: AdminActor, query: string, db: Db = defaultDb) {
  assertAdmin(actor);
  const q = query.trim();
  const token = q.match(/\/c\/([A-Za-z0-9_-]+)/)?.[1] ?? q;
  return db
    .select({
      id: card.id,
      token: card.token,
      status: card.status,
      destination: card.destination,
      ownerEmail: user.email,
      batchId: card.batchId,
      claimedAt: card.claimedAt,
    })
    .from(card)
    .leftJoin(user, eq(card.ownerId, user.id))
    .where(q ? or(ilike(card.token, `${token.replace(/[%_\\]/g, "\\$&")}%`), ilike(user.email, `%${q.replace(/[%_\\]/g, "\\$&")}%`)) : undefined)
    .orderBy(desc(card.createdAt))
    .limit(100);
}

export async function getCardForAdmin(actor: AdminActor, cardId: string, db: Db = defaultDb) {
  assertAdmin(actor);
  const row = await db.query.card.findFirst({
    where: eq(card.id, cardId),
    with: {
      owner: { columns: { id: true, email: true, name: true } },
      profile: { columns: { slug: true, isPublished: true } },
      batch: { columns: { id: true, label: true } },
      orderItem: { with: { order: { columns: { id: true, reference: true } } } },
      assignments: { orderBy: (a, { desc }) => [desc(a.assignedAt)] },
    },
  });
  if (!row) throw new NotFoundError("Card not found.");
  const { claimCodeHash: _hidden, ...rest } = row;
  void _hidden;
  return rest;
}

async function loadCard(tx: Tx | Db, cardId: string) {
  const row = await tx.query.card.findFirst({ where: eq(card.id, cardId) });
  if (!row) throw new NotFoundError("Card not found.");
  return row;
}

async function endOpenAssignments(tx: Tx, cardId: string) {
  await tx.update(cardAssignment).set({ endedAt: new Date() }).where(and(eq(cardAssignment.cardId, cardId), isNull(cardAssignment.endedAt)));
}

export async function setCardActive(actor: AdminActor, cardId: string, active: boolean, db: Db = defaultDb) {
  assertAdmin(actor);
  await db.transaction(async (tx) => {
    const before = await loadCard(tx, cardId);
    if (active && !before.ownerId) throw new UserFacingError("This card has no owner. Assign it to someone instead.");
    const [after] = await tx
      .update(card)
      .set(active ? { status: "ACTIVE", deactivatedAt: null } : { status: "DEACTIVATED", deactivatedAt: new Date() })
      .where(eq(card.id, cardId))
      .returning();
    await recordAudit(tx, actor, active ? "card.reactivate" : "card.disable", { type: "card", id: cardId }, snapshot(before), snapshot(after));
  });
}

/** Moves a card to another customer (by email). Their profile is created as a draft if they don't have one. */
export async function reassignCard(actor: AdminActor, cardId: string, email: string, db: Db = defaultDb) {
  assertAdmin(actor);
  const target = await db.query.user.findFirst({ where: eq(user.email, email.trim().toLowerCase()) });
  if (!target) throw new UserFacingError("No customer has that email address. They need an account first.", "email");
  const targetProfile = await ensureOwnProfile(target.id, target.name, db);
  await db.transaction(async (tx) => {
    const before = await loadCard(tx, cardId);
    await endOpenAssignments(tx, cardId);
    const [after] = await tx
      .update(card)
      .set({ ownerId: target.id, profileId: targetProfile.id, status: "ACTIVE", deactivatedAt: null, claimedAt: new Date(), label: null })
      .where(eq(card.id, cardId))
      .returning();
    await tx.insert(cardAssignment).values({ cardId, userId: target.id, profileId: targetProfile.id, method: "admin", assignedById: actor.id });
    await recordAudit(tx, actor, "card.reassign", { type: "card", id: cardId }, snapshot(before), snapshot(after));
  });
}

/**
 * Detaches a card from its owner and returns it to stock with a NEW claim
 * code (the old one may be known to the previous owner). Returns the code;
 * it is shown once.
 */
export async function releaseCard(actor: AdminActor, cardId: string, secret: string, db: Db = defaultDb) {
  assertAdmin(actor);
  const claimCode = generateClaimCode();
  await db.transaction(async (tx) => {
    const before = await loadCard(tx, cardId);
    await endOpenAssignments(tx, cardId);
    const [after] = await tx
      .update(card)
      .set({
        ownerId: null,
        profileId: null,
        status: "UNCLAIMED",
        destination: "PROFILE",
        label: null,
        claimedAt: null,
        deactivatedAt: null,
        orderItemId: null,
        claimCodeHash: hashClaimCode(claimCode, secret),
      })
      .where(eq(card.id, cardId))
      .returning();
    await recordAudit(tx, actor, "card.release", { type: "card", id: cardId }, snapshot(before), snapshot(after));
  });
  return { claimCode };
}
