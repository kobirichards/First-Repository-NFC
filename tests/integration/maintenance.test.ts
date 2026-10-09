import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db";
import { cart, product } from "@/db/schema";
import { addToCart, createCart } from "@/server/cart";
import { runCleanup } from "@/server/maintenance";
import type { ListedObject, ObjectStorage } from "@/server/storage";

class FakeStorage implements ObjectStorage {
  deleted: string[] = [];
  constructor(private objects: ListedObject[]) {}
  async put() {}
  async get() {
    return null;
  }
  async delete(key: string) {
    this.deleted.push(key);
  }
  async list(prefix: string) {
    return this.objects.filter((o) => o.key.startsWith(prefix));
  }
}

describe("cleanup", () => {
  it("removes old anonymous carts and unreferenced old uploads, and keeps everything in use", async () => {
    const old = new Date(Date.now() - 40 * 24 * 3600 * 1000);
    const staleCart = await createCart(null, "GBP");
    await db.update(cart).set({ updatedAt: old }).where(eq(cart.id, staleCart));
    const freshCart = await createCart(null, "GBP");

    const [p] = await db.insert(product).values({ slug: `cleanup-${Date.now()}`, name: "P", description: "d", customisable: true }).returning();
    const inUse = "artwork/11111111-1111-4111-8111-111111111111.png";
    await addToCart(freshCart, { productId: p.id, quantity: 1, customisation: { artworkKey: inUse } });

    const storage = new FakeStorage([
      { key: inUse, lastModified: old },
      { key: "artwork/22222222-2222-4222-8222-222222222222.png", lastModified: old },
      { key: "artwork/33333333-3333-4333-8333-333333333333.png", lastModified: new Date() },
      { key: "profile/orphan.webp", lastModified: old },
    ]);
    const result = await runCleanup(new Date(), db, storage);

    expect(await db.query.cart.findFirst({ where: eq(cart.id, staleCart) })).toBeUndefined();
    expect(await db.query.cart.findFirst({ where: eq(cart.id, freshCart) })).toBeDefined();
    expect(storage.deleted.sort()).toEqual(["artwork/22222222-2222-4222-8222-222222222222.png", "profile/orphan.webp"]);
    expect(result.artworkDeleted).toBe(1);
  });
});
