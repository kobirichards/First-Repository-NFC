import "server-only";
import { and, eq } from "drizzle-orm";
import { type Currency, MAX_LINES_PER_CART, MAX_QUANTITY_PER_LINE } from "@/config/commerce";
import type { Db } from "@/db";
import { db as defaultDb } from "@/db";
import { type Customisation, cart, cartItem, product } from "@/db/schema";
import { resolvePrice } from "./catalog";
import { NotFoundError, UserFacingError } from "./errors";

/*
 * Carts are identified by an unguessable id kept in an httpOnly cookie.
 * Every function takes that id and only touches that cart's items.
 * Prices are never stored in the cart: they are looked up in the visitor's
 * current currency every time, so a price change or currency switch is
 * always reflected before payment.
 */

export type CartLine = {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  optionId: string | null;
  optionName: string | null;
  quantity: number;
  customisation: Customisation | null;
  /** Null when the item isn't sold in this currency or is no longer available. */
  unitAmount: number | null;
  lineTotal: number | null;
  available: boolean;
};

export type CartView = {
  id: string;
  currency: Currency;
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  /** False if any line can't currently be bought. */
  purchasable: boolean;
};

export async function createCart(userId: string | null, currency: Currency, db: Db = defaultDb) {
  const [row] = await db.insert(cart).values({ userId, currency }).returning({ id: cart.id });
  return row.id;
}

export async function cartExists(cartId: string, db: Db = defaultDb) {
  if (!isCartId(cartId)) return false;
  return Boolean(await db.query.cart.findFirst({ where: eq(cart.id, cartId), columns: { id: true } }));
}

export function isCartId(value: string | undefined | null): value is string {
  return Boolean(value && /^[0-9a-f-]{36}$/.test(value));
}

export async function getCartView(cartId: string, currency: Currency, db: Db = defaultDb): Promise<CartView | null> {
  if (!isCartId(cartId)) return null;
  const row = await db.query.cart.findFirst({
    where: eq(cart.id, cartId),
    with: { items: { with: { product: { with: { prices: true } }, option: true }, orderBy: (i, { asc }) => [asc(i.createdAt)] } },
  });
  if (!row) return null;
  const lines: CartLine[] = row.items.map((item) => {
    const optionActive = item.option ? item.option.isActive && item.option.productId === item.productId : true;
    const inStock = item.option?.inventory == null || item.option.inventory >= item.quantity;
    const unitAmount = item.product.isActive && optionActive ? resolvePrice(item.product.prices, item.optionId, currency) : null;
    const available = unitAmount !== null && inStock;
    return {
      id: item.id,
      productId: item.productId,
      productSlug: item.product.slug,
      productName: item.product.name,
      optionId: item.optionId,
      optionName: item.option?.name ?? null,
      quantity: item.quantity,
      customisation: item.customisation ?? null,
      unitAmount,
      lineTotal: unitAmount === null ? null : unitAmount * item.quantity,
      available,
    };
  });
  return {
    id: row.id,
    currency,
    lines,
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce((sum, l) => sum + (l.lineTotal ?? 0), 0),
    purchasable: lines.length > 0 && lines.every((l) => l.available),
  };
}

export async function addToCart(
  cartId: string,
  input: { productId: string; optionId?: string; quantity: number; customisation?: Customisation },
  db: Db = defaultDb,
) {
  const p = await db.query.product.findFirst({
    where: and(eq(product.id, input.productId), eq(product.isActive, true)),
    with: { options: true },
  });
  if (!p) throw new NotFoundError("That product isn't available any more.");

  const activeOptions = p.options.filter((o) => o.isActive);
  if (activeOptions.length > 0 && !input.optionId) throw new UserFacingError("Choose a finish.", "optionId");
  const option = input.optionId ? activeOptions.find((o) => o.id === input.optionId) : undefined;
  if (input.optionId && !option) throw new UserFacingError("That finish isn't available any more. Choose another.", "optionId");
  if (option?.inventory != null && option.inventory < input.quantity) {
    throw new UserFacingError(option.inventory === 0 ? "That finish is out of stock." : `Only ${option.inventory} left in that finish.`, "quantity");
  }

  const customisation = p.customisable ? input.customisation : undefined;
  const hasCustomisation = Boolean(customisation && (customisation.printName || customisation.printTitle || customisation.artworkKey));

  const items = await db.query.cartItem.findMany({ where: eq(cartItem.cartId, cartId) });
  // Plain items of the same kind merge into one line; customised items always get their own line.
  if (!hasCustomisation) {
    const existing = items.find((i) => i.productId === p.id && (i.optionId ?? undefined) === input.optionId && !i.customisation);
    if (existing) {
      const quantity = Math.min(existing.quantity + input.quantity, MAX_QUANTITY_PER_LINE);
      await db.update(cartItem).set({ quantity }).where(eq(cartItem.id, existing.id));
      return;
    }
  }

  if (items.length >= MAX_LINES_PER_CART) {
    throw new UserFacingError(`Your basket can hold up to ${MAX_LINES_PER_CART} different items. For a bigger order, ask us for a team quote.`);
  }
  await db.insert(cartItem).values({
    cartId,
    productId: p.id,
    optionId: option?.id ?? null,
    quantity: input.quantity,
    customisation: hasCustomisation ? customisation : null,
  });
}

export async function updateCartItemQuantity(cartId: string, itemId: string, quantity: number, db: Db = defaultDb) {
  const updated = await db
    .update(cartItem)
    .set({ quantity })
    .where(and(eq(cartItem.id, itemId), eq(cartItem.cartId, cartId)))
    .returning({ id: cartItem.id });
  if (updated.length === 0) throw new NotFoundError("That item isn't in your basket any more.");
}

export async function removeCartItem(cartId: string, itemId: string, db: Db = defaultDb) {
  await db.delete(cartItem).where(and(eq(cartItem.id, itemId), eq(cartItem.cartId, cartId)));
}

export async function clearCart(cartId: string, db: Db = defaultDb) {
  await db.delete(cartItem).where(eq(cartItem.cartId, cartId));
}
