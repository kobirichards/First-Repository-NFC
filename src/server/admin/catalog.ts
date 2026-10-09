import "server-only";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { CURRENCIES, type Currency } from "@/config/commerce";
import type { Db } from "@/db";
import { db as defaultDb } from "@/db";
import { price, product, productOption } from "@/db/schema";
import { NotFoundError, UserFacingError } from "../errors";
import { recordAudit } from "./audit";
import { type AdminActor, assertAdmin } from "./guard";

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens.")
  .max(60);

export const productInput = z.object({
  slug,
  name: z.string().trim().min(1, "Enter a name.").max(100),
  description: z.string().trim().min(1, "Enter a description.").max(1000),
  customisable: z.boolean(),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

export const optionInput = z.object({
  slug,
  name: z.string().trim().min(1, "Enter a name.").max(100),
  description: z.string().trim().max(300).optional().transform((v) => v || null),
  inventory: z.union([z.literal("").transform(() => null), z.coerce.number().int().min(0).max(1_000_000)]).nullable(),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

export async function listProductsForAdmin(actor: AdminActor, db: Db = defaultDb) {
  assertAdmin(actor);
  return db.query.product.findMany({
    orderBy: [asc(product.sortOrder), asc(product.name)],
    with: { options: { orderBy: [asc(productOption.sortOrder)] }, prices: true },
  });
}

export async function getProductForAdmin(actor: AdminActor, productId: string, db: Db = defaultDb) {
  assertAdmin(actor);
  const row = await db.query.product.findFirst({
    where: eq(product.id, productId),
    with: { options: { orderBy: [asc(productOption.sortOrder)] }, prices: true },
  });
  if (!row) throw new NotFoundError("Product not found.");
  return row;
}

async function assertSlugFree(db: Db, value: string, exceptId?: string) {
  const existing = await db.query.product.findFirst({ where: eq(product.slug, value), columns: { id: true } });
  if (existing && existing.id !== exceptId) throw new UserFacingError("Another product uses that address.", "slug");
}

export async function createProduct(actor: AdminActor, raw: z.input<typeof productInput>, db: Db = defaultDb) {
  assertAdmin(actor);
  const input = productInput.parse(raw);
  await assertSlugFree(db, input.slug);
  return db.transaction(async (tx) => {
    const [created] = await tx.insert(product).values(input).returning();
    await recordAudit(tx, actor, "product.create", { type: "product", id: created.id }, null, input);
    return created.id;
  });
}

export async function updateProduct(actor: AdminActor, productId: string, raw: z.input<typeof productInput>, db: Db = defaultDb) {
  assertAdmin(actor);
  const input = productInput.parse(raw);
  await assertSlugFree(db, input.slug, productId);
  await db.transaction(async (tx) => {
    const before = await tx.query.product.findFirst({ where: eq(product.id, productId) });
    if (!before) throw new NotFoundError("Product not found.");
    await tx.update(product).set(input).where(eq(product.id, productId));
    const { createdAt: _a, updatedAt: _b, ...prev } = before;
    void _a;
    void _b;
    await recordAudit(tx, actor, "product.update", { type: "product", id: productId }, prev, input);
  });
}

export async function upsertOption(
  actor: AdminActor,
  productId: string,
  optionId: string | null,
  raw: z.input<typeof optionInput>,
  db: Db = defaultDb,
) {
  assertAdmin(actor);
  const input = optionInput.parse(raw);
  await db.transaction(async (tx) => {
    const p = await tx.query.product.findFirst({ where: eq(product.id, productId), with: { options: true } });
    if (!p) throw new NotFoundError("Product not found.");
    const clash = p.options.find((o) => o.slug === input.slug && o.id !== optionId);
    if (clash) throw new UserFacingError("Another finish on this product uses that code.", "slug");
    if (optionId) {
      const before = p.options.find((o) => o.id === optionId);
      if (!before) throw new NotFoundError("Finish not found.");
      await tx.update(productOption).set(input).where(eq(productOption.id, optionId));
      await recordAudit(tx, actor, "option.update", { type: "product_option", id: optionId }, before, input);
    } else {
      const [created] = await tx.insert(productOption).values({ ...input, productId }).returning();
      await recordAudit(tx, actor, "option.create", { type: "product_option", id: created.id }, null, input);
    }
  });
}

/** Sets (or, with amount null, removes) a price. optionId null means the product's base price. */
export async function setPrice(
  actor: AdminActor,
  productId: string,
  optionId: string | null,
  currency: Currency,
  amount: number | null,
  db: Db = defaultDb,
) {
  assertAdmin(actor);
  if (!CURRENCIES.includes(currency)) throw new UserFacingError("Unknown currency.");
  if (amount !== null && (!Number.isInteger(amount) || amount < 0 || amount > 10_000_000)) {
    throw new UserFacingError("Enter a price in pounds/euros/dollars, like 24 or 24.50.", "amount");
  }
  await db.transaction(async (tx) => {
    if (optionId) {
      const o = await tx.query.productOption.findFirst({ where: and(eq(productOption.id, optionId), eq(productOption.productId, productId)) });
      if (!o) throw new NotFoundError("Finish not found.");
    }
    const where = and(eq(price.productId, productId), optionId ? eq(price.optionId, optionId) : isNull(price.optionId), eq(price.currency, currency));
    const before = await tx.query.price.findFirst({ where });
    if (amount === null) {
      if (before) await tx.delete(price).where(eq(price.id, before.id));
    } else if (before) {
      await tx.update(price).set({ amount }).where(eq(price.id, before.id));
    } else {
      await tx.insert(price).values({ productId, optionId, currency, amount });
    }
    await recordAudit(tx, actor, "price.set", { type: "product", id: productId }, { optionId, currency, amount: before?.amount ?? null }, { optionId, currency, amount });
  });
}
