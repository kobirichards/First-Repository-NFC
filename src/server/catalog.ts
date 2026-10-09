import "server-only";
import { and, asc, eq } from "drizzle-orm";
import type { Currency } from "@/config/commerce";
import type { Db } from "@/db";
import { db as defaultDb } from "@/db";
import { product, productOption } from "@/db/schema";
import { cacheLife, cacheTag } from "next/cache";
import { CATALOG_TAG } from "./cache-tags";

export type CatalogOption = { id: string; slug: string; name: string; description: string | null; price: number | null; inStock: boolean };
export type CatalogProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  customisable: boolean;
  basePrice: number | null;
  options: CatalogOption[];
  /** Lowest available price, for "from £24". */
  fromPrice: number | null;
};

type ProductRow = Awaited<ReturnType<typeof queryProducts>>[number];

/**
 * The live catalogue is read on every shop page, so it's cached and tagged
 * "catalog". Admin edits and stock changes expire the tag (see cache-tags.ts).
 * Prices shown here are for display: the basket and checkout always re-read
 * them from the database.
 */
async function loadCachedProducts(slug?: string) {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  return queryProducts(defaultDb, slug);
}

function loadProducts(db: Db, slug?: string) {
  return db === defaultDb ? loadCachedProducts(slug) : queryProducts(db, slug);
}

async function queryProducts(db: Db, slug?: string) {
  return db.query.product.findMany({
    where: slug ? and(eq(product.isActive, true), eq(product.slug, slug)) : eq(product.isActive, true),
    orderBy: [asc(product.sortOrder), asc(product.name)],
    with: {
      prices: true,
      options: { where: eq(productOption.isActive, true), orderBy: [asc(productOption.sortOrder)] },
    },
  });
}

/** Option price if set for the currency, otherwise the product price. Null if neither exists (not sold in that currency). */
export function resolvePrice(
  prices: Array<{ optionId: string | null; currency: Currency; amount: number }>,
  optionId: string | null,
  currency: Currency,
): number | null {
  const optionPrice = optionId ? prices.find((p) => p.optionId === optionId && p.currency === currency) : undefined;
  if (optionPrice) return optionPrice.amount;
  return prices.find((p) => p.optionId === null && p.currency === currency)?.amount ?? null;
}

function toCatalogProduct(row: ProductRow, currency: Currency): CatalogProduct {
  const options = row.options.map((o) => ({
    id: o.id,
    slug: o.slug,
    name: o.name,
    description: o.description,
    price: resolvePrice(row.prices, o.id, currency),
    inStock: o.inventory === null || o.inventory > 0,
  }));
  const basePrice = resolvePrice(row.prices, null, currency);
  const candidates = (options.length ? options.filter((o) => o.inStock).map((o) => o.price) : [basePrice]).filter(
    (p): p is number => p !== null,
  );
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    customisable: row.customisable,
    basePrice,
    options,
    fromPrice: candidates.length ? Math.min(...candidates) : null,
  };
}

export async function listProducts(currency: Currency, db: Db = defaultDb): Promise<CatalogProduct[]> {
  return (await loadProducts(db)).map((row) => toCatalogProduct(row, currency));
}

export async function getProduct(slug: string, currency: Currency, db: Db = defaultDb): Promise<CatalogProduct | null> {
  if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
  const [row] = await loadProducts(db, slug);
  return row ? toCatalogProduct(row, currency) : null;
}
