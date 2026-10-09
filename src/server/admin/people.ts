import "server-only";
import { desc, eq, ilike, or } from "drizzle-orm";
import type { Db } from "@/db";
import { db as defaultDb } from "@/db";
import { enquiry, enquiryStatus, user } from "@/db/schema";
import { NotFoundError, UserFacingError } from "../errors";
import { recordAudit } from "./audit";
import { type AdminActor, assertAdmin } from "./guard";
import { pageRequest, toPaged } from "../pagination";

export async function listCustomers(actor: AdminActor, query = "", page = 1, db: Db = defaultDb) {
  assertAdmin(actor);
  const q = query.trim().replace(/[%_\\]/g, "\\$&");
  const request = pageRequest(page);
  const rows = await db.query.user.findMany({
    where: q ? or(ilike(user.email, `%${q}%`), ilike(user.name, `%${q}%`)) : undefined,
    orderBy: [desc(user.createdAt), desc(user.id)],
    limit: request.limit,
    offset: request.offset,
    columns: { id: true, name: true, email: true, emailVerified: true, role: true, createdAt: true },
  });
  return toPaged(rows, request);
}

export async function getCustomer(actor: AdminActor, userId: string, db: Db = defaultDb) {
  assertAdmin(actor);
  const row = await db.query.user.findFirst({
    where: eq(user.id, userId),
    columns: { id: true, name: true, email: true, emailVerified: true, role: true, twoFactorEnabled: true, createdAt: true },
    with: {
      profile: { columns: { slug: true, displayName: true, isPublished: true } },
      cards: { columns: { id: true, token: true, status: true, destination: true, label: true } },
      orders: { columns: { id: true, reference: true, status: true, total: true, currency: true, createdAt: true } },
    },
  });
  if (!row) throw new NotFoundError("Customer not found.");
  return row;
}

export type EnquiryStatus = (typeof enquiryStatus.enumValues)[number];

export async function listEnquiries(actor: AdminActor, status?: EnquiryStatus, page = 1, db: Db = defaultDb) {
  assertAdmin(actor);
  const request = pageRequest(page);
  const rows = await db.query.enquiry.findMany({
    where: status ? eq(enquiry.status, status) : undefined,
    orderBy: [desc(enquiry.createdAt), desc(enquiry.id)],
    limit: request.limit,
    offset: request.offset,
  });
  return toPaged(rows, request);
}

export async function countEnquiries(actor: AdminActor, status: EnquiryStatus, db: Db = defaultDb) {
  assertAdmin(actor);
  return db.$count(enquiry, eq(enquiry.status, status));
}

export async function setEnquiryStatus(actor: AdminActor, enquiryId: string, status: EnquiryStatus, db: Db = defaultDb) {
  assertAdmin(actor);
  if (!enquiryStatus.enumValues.includes(status)) throw new UserFacingError("Choose a valid status.");
  await db.transaction(async (tx) => {
    const before = await tx.query.enquiry.findFirst({ where: eq(enquiry.id, enquiryId) });
    if (!before) throw new NotFoundError("Enquiry not found.");
    await tx.update(enquiry).set({ status }).where(eq(enquiry.id, enquiryId));
    await recordAudit(tx, actor, "enquiry.status", { type: "enquiry", id: enquiryId }, { status: before.status }, { status });
  });
}
