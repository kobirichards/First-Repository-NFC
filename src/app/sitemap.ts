import { and, eq } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { db } from "@/db";
import { product, profile } from "@/db/schema";

/** Built per request from the database: public pages, products, and only profiles whose owners opted in to search engines. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const [products, profiles] = await Promise.all([
    db.query.product.findMany({ where: eq(product.isActive, true), columns: { slug: true, updatedAt: true } }),
    db.query.profile.findMany({
      where: and(eq(profile.isPublished, true), eq(profile.allowIndexing, true)),
      columns: { slug: true, updatedAt: true },
    }),
  ]);
  const pages = ["", "/shop", "/teams", "/about", "/contact", "/shipping-returns", "/privacy", "/terms", "/cookies"];
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: "monthly" as const, priority: p === "" ? 1 : 0.6 })),
    ...products.map((p) => ({ url: `${base}/shop/${p.slug}`, lastModified: p.updatedAt, priority: 0.8 })),
    ...profiles.map((p) => ({ url: `${base}/p/${p.slug}`, lastModified: p.updatedAt, priority: 0.3 })),
  ];
}
