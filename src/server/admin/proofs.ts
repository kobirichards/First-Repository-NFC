import "server-only";
import { desc, eq } from "drizzle-orm";
import { env } from "@/config/env";
import type { Db } from "@/db";
import { db as defaultDb } from "@/db";
import { artworkProof, order, orderItem, proofStatus } from "@/db/schema";
import { sendEmail } from "../email";
import { orderStatusMessage } from "../email/templates";
import { NotFoundError, UserFacingError } from "../errors";
import { getStorage } from "../storage";
import { recordAudit } from "./audit";
import { type AdminActor, assertAdmin } from "./guard";

export type ProofStatus = (typeof proofStatus.enumValues)[number];

export async function listProofs(actor: AdminActor, status: ProofStatus | undefined = "PENDING", db: Db = defaultDb) {
  assertAdmin(actor);
  return db.query.artworkProof.findMany({
    where: status ? eq(artworkProof.status, status) : undefined,
    orderBy: [desc(artworkProof.createdAt)],
    limit: 200,
    with: { orderItem: { with: { order: { columns: { id: true, reference: true, email: true } } } } },
  });
}

/**
 * Approves or rejects a proof. When every proof on an order is approved and
 * the order is waiting on proofs, it moves to "In production". Rejections
 * email the customer the reason.
 */
export async function reviewProof(actor: AdminActor, proofId: string, decision: "APPROVED" | "REJECTED", notes: string, db: Db = defaultDb) {
  assertAdmin(actor);
  const cleanNotes = notes.trim().slice(0, 1000);
  if (decision === "REJECTED" && !cleanNotes) throw new UserFacingError("Say what needs to change, so the customer can fix it.", "notes");

  const result = await db.transaction(async (tx) => {
    const proof = await tx.query.artworkProof.findFirst({
      where: eq(artworkProof.id, proofId),
      with: { orderItem: { with: { order: true } } },
    });
    if (!proof) throw new NotFoundError("Proof not found.");
    await tx
      .update(artworkProof)
      .set({ status: decision, reviewNotes: cleanNotes || null, reviewedById: actor.id, reviewedAt: new Date() })
      .where(eq(artworkProof.id, proofId));
    await recordAudit(tx, actor, "proof.review", { type: "artwork_proof", id: proofId }, { status: proof.status }, { status: decision, notes: cleanNotes || null });

    const o = proof.orderItem.order;
    let movedToProduction = false;
    if (decision === "APPROVED" && o.status === "AWAITING_PROOF") {
      const all = await tx
        .select({ status: artworkProof.status })
        .from(artworkProof)
        .innerJoin(orderItem, eq(artworkProof.orderItemId, orderItem.id))
        .where(eq(orderItem.orderId, o.id));
      if (all.every((p) => p.status === "APPROVED")) {
        await tx.update(order).set({ status: "IN_PRODUCTION" }).where(eq(order.id, o.id));
        await recordAudit(tx, actor, "order.status", { type: "order", id: o.id }, { status: o.status }, { status: "IN_PRODUCTION", reason: "all proofs approved" });
        movedToProduction = true;
      }
    }
    return { order: o, movedToProduction };
  });

  const o = result.order;
  if (o.email && (decision === "REJECTED" || result.movedToProduction)) {
    const url = o.userId ? `${env.appUrl}/dashboard/orders/${o.reference}` : null;
    const message =
      decision === "REJECTED"
        ? orderStatusMessage(o.email, o.reference, "We need a change to your design", `Before we can print your cards: ${cleanNotes} Reply to this email with an updated file or details.`, url)
        : orderStatusMessage(o.email, o.reference, "Your design is approved", "Your design is approved and your cards are now being made.", url);
    await sendEmail(message).catch((e: unknown) => console.error("[admin] proof email failed:", e instanceof Error ? e.message : e));
  }
  return { movedToProduction: result.movedToProduction };
}

/** Uploaded artwork, for admins only. */
export async function getArtworkFile(actor: AdminActor, key: string) {
  assertAdmin(actor);
  if (!/^artwork\/[0-9a-f-]{36}\.png$/.test(key)) return null;
  return getStorage().get(key);
}
