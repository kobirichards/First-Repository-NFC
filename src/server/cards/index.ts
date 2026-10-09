import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { db as defaultDb } from "@/db";
import { card, cardAssignment, profile } from "@/db/schema";
import { safeExternalUrl } from "@/lib/urls";
import { NotFoundError, UserFacingError } from "../errors";
import { ensureOwnProfile } from "../profiles";
import { claimCodeMatches, isWellFormedCardToken } from "./tokens";
import { type Paged, pageRequest, toPaged } from "../pagination";

/*
 * Ownership: every customer function filters by `ownerId = userId`, so a
 * card that isn't yours behaves exactly like a card that doesn't exist.
 */

export type OwnCard = {
  id: string;
  token: string;
  label: string | null;
  status: "UNCLAIMED" | "ACTIVE" | "DEACTIVATED";
  destination: "PROFILE" | "LINKEDIN";
  claimedAt: Date | null;
  deactivatedAt: Date | null;
};

const ownCardColumns = {
  id: true,
  token: true,
  label: true,
  status: true,
  destination: true,
  claimedAt: true,
  deactivatedAt: true,
} as const;

export async function listOwnCards(userId: string, page = 1, db: Db = defaultDb): Promise<Paged<OwnCard>> {
  const request = pageRequest(page, 20);
  const rows = await db.query.card.findMany({
    where: eq(card.ownerId, userId),
    columns: ownCardColumns,
    orderBy: [desc(card.claimedAt), desc(card.createdAt), desc(card.id)],
    limit: request.limit,
    offset: request.offset,
  });
  return toPaged(rows, request);
}

/** Totals for the account overview, without loading every card. */
export async function countOwnCards(userId: string, db: Db = defaultDb) {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      active: sql<number>`count(*) filter (where ${card.status} = 'ACTIVE')::int`,
    })
    .from(card)
    .where(eq(card.ownerId, userId));
  return { total: row?.total ?? 0, active: row?.active ?? 0 };
}

export async function getOwnCard(userId: string, cardId: string, db: Db = defaultDb): Promise<OwnCard> {
  const row = await db.query.card.findFirst({
    where: and(eq(card.id, cardId), eq(card.ownerId, userId)),
    columns: ownCardColumns,
  });
  if (!row) throw new NotFoundError("We couldn't find that card in your account.");
  return row;
}

async function updateOwnCard(userId: string, cardId: string, values: Partial<typeof card.$inferInsert>, db: Db) {
  const updated = await db
    .update(card)
    .set(values)
    .where(and(eq(card.id, cardId), eq(card.ownerId, userId)))
    .returning({ id: card.id });
  if (updated.length === 0) throw new NotFoundError("We couldn't find that card in your account.");
}

export async function renameOwnCard(userId: string, cardId: string, label: string | null, db: Db = defaultDb) {
  await updateOwnCard(userId, cardId, { label }, db);
}

export async function setOwnCardDestination(userId: string, cardId: string, destination: "PROFILE" | "LINKEDIN", db: Db = defaultDb) {
  if (destination === "LINKEDIN") {
    const p = await db.query.profile.findFirst({ where: eq(profile.userId, userId), columns: { linkedinUrl: true } });
    if (!safeExternalUrl(p?.linkedinUrl)) {
      throw new UserFacingError("Add your LinkedIn address to your profile first, then send this card to LinkedIn.");
    }
  }
  await updateOwnCard(userId, cardId, { destination }, db);
}

export async function deactivateOwnCard(userId: string, cardId: string, db: Db = defaultDb) {
  await updateOwnCard(userId, cardId, { status: "DEACTIVATED", deactivatedAt: new Date() }, db);
}

export async function reactivateOwnCard(userId: string, cardId: string, db: Db = defaultDb) {
  await updateOwnCard(userId, cardId, { status: "ACTIVE", deactivatedAt: null }, db);
}

// ---------------------------------------------------------------------------
// Claiming
// ---------------------------------------------------------------------------

export type ClaimableCard = { token: string; status: OwnCard["status"]; ownedByViewer: boolean };

/** What the activation page may know about a token: nothing about any other owner. */
export async function getClaimState(token: string, viewerUserId: string | null, db: Db = defaultDb): Promise<ClaimableCard | null> {
  if (!isWellFormedCardToken(token)) return null;
  const row = await db.query.card.findFirst({ where: eq(card.token, token), columns: { status: true, ownerId: true } });
  if (!row) return null;
  return { token, status: row.status, ownedByViewer: Boolean(viewerUserId && row.ownerId === viewerUserId) };
}

const GENERIC_CLAIM_ERROR = "That claim code doesn't match this card. Check the code on the packaging and try again.";

/**
 * Links an unclaimed card to the user, if the claim code matches. Unknown
 * tokens, already-claimed cards and wrong codes all give the same message,
 * so the form can't be used to learn anything about other cards.
 * Callers must rate-limit (see RULES.claimPerUser / claimPerCard).
 */
export async function claimCard(
  user: { id: string; name: string },
  token: string,
  code: string,
  secret: string,
  db: Db = defaultDb,
): Promise<{ cardId: string }> {
  if (!isWellFormedCardToken(token)) throw new UserFacingError(GENERIC_CLAIM_ERROR, "code");
  const row = await db.query.card.findFirst({ where: eq(card.token, token) });
  if (!row) throw new UserFacingError(GENERIC_CLAIM_ERROR, "code");
  if (row.ownerId === user.id) return { cardId: row.id };
  if (row.status !== "UNCLAIMED" || row.ownerId || !claimCodeMatches(code, row.claimCodeHash, secret)) {
    throw new UserFacingError(GENERIC_CLAIM_ERROR, "code");
  }

  const ownProfile = await ensureOwnProfile(user.id, user.name, db);
  return db.transaction(async (tx) => {
    // Conditional update: if two people race to claim the same card, only one wins.
    const claimed = await tx
      .update(card)
      .set({ ownerId: user.id, profileId: ownProfile.id, status: "ACTIVE", claimedAt: new Date() })
      .where(and(eq(card.id, row.id), eq(card.status, "UNCLAIMED"), isNull(card.ownerId)))
      .returning({ id: card.id });
    if (claimed.length === 0) throw new UserFacingError(GENERIC_CLAIM_ERROR, "code");
    await tx.insert(cardAssignment).values({ cardId: row.id, userId: user.id, profileId: ownProfile.id, method: "claim" });
    return { cardId: row.id };
  });
}

// ---------------------------------------------------------------------------
// Resolution: what happens when someone taps or scans a card
// ---------------------------------------------------------------------------

export type CardResolution =
  | { kind: "redirect"; location: string; cardId: string; profileId: string }
  | { kind: "unclaimed" }
  | { kind: "not-ready" }
  | { kind: "inactive" };

/**
 * Pure decision logic, separated from the database so every state is easy to test.
 * Unknown and deactivated tokens resolve identically ("inactive").
 */
export function decideResolution(
  row:
    | {
        id: string;
        status: OwnCard["status"];
        destination: OwnCard["destination"];
        profile: { id: string; slug: string; isPublished: boolean; linkedinUrl: string | null } | null;
      }
    | null
    | undefined,
): CardResolution {
  if (!row || row.status === "DEACTIVATED") return { kind: "inactive" };
  if (row.status === "UNCLAIMED") return { kind: "unclaimed" };
  const p = row.profile;
  if (!p) return { kind: "not-ready" };
  if (row.destination === "LINKEDIN") {
    const linkedin = safeExternalUrl(p.linkedinUrl);
    if (linkedin) return { kind: "redirect", location: linkedin, cardId: row.id, profileId: p.id };
  }
  if (!p.isPublished) return { kind: "not-ready" };
  return { kind: "redirect", location: `/p/${p.slug}`, cardId: row.id, profileId: p.id };
}

export async function resolveCardToken(token: string, db: Db = defaultDb): Promise<CardResolution> {
  if (!isWellFormedCardToken(token)) return { kind: "inactive" };
  const row = await db.query.card.findFirst({
    where: eq(card.token, token),
    columns: { id: true, status: true, destination: true },
    with: { profile: { columns: { id: true, slug: true, isPublished: true, linkedinUrl: true } } },
  });
  return decideResolution(row);
}
