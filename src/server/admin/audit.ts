import "server-only";
import { and, desc, eq, type SQL } from "drizzle-orm";
import type { Db } from "@/db";
import { db as defaultDb } from "@/db";
import { auditEvent } from "@/db/schema";
import { type AdminActor, assertAdmin } from "./guard";
import { pageRequest, toPaged } from "../pagination";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0] | Db;

/** Records who did what to which record, with before/after snapshots. Call inside the same transaction as the change. */
export async function recordAudit(
  tx: Tx,
  actor: { id: string },
  action: string,
  entity: { type: string; id: string },
  before: unknown,
  after: unknown,
) {
  await tx.insert(auditEvent).values({
    actorId: actor.id,
    action,
    entityType: entity.type,
    entityId: entity.id,
    before: before ?? null,
    after: after ?? null,
  });
}

export async function listAuditEvents(
  actor: AdminActor,
  filter: { entityType?: string; entityId?: string; page?: number; size?: number } = {},
  db: Db = defaultDb,
) {
  assertAdmin(actor);
  const request = pageRequest(filter.page, Math.min(filter.size ?? 100, 200));
  const conditions: SQL[] = [];
  if (filter.entityType) conditions.push(eq(auditEvent.entityType, filter.entityType));
  if (filter.entityId) conditions.push(eq(auditEvent.entityId, filter.entityId));
  const rows = await db.query.auditEvent.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    orderBy: [desc(auditEvent.createdAt), desc(auditEvent.id)],
    limit: request.limit,
    offset: request.offset,
    with: { actor: { columns: { email: true, name: true } } },
  });
  return toPaged(rows, request);
}
