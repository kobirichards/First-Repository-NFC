"use server";

import { refresh } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isCurrency } from "@/config/commerce";
import { env } from "@/config/env";
import { addToCartSchema, quantitySchema } from "@/lib/validation/cart";
import { addToCart, removeCartItem, updateCartItemQuantity } from "@/server/cart";
import { ensureCartId, readCartId } from "@/server/cart-cookie";
import { CURRENCY_COOKIE, getCurrency } from "@/server/currency";
import { UserFacingError } from "@/server/errors";
import { ImageRejectedError, processArtwork } from "@/server/images";
import { startCheckout } from "@/server/orders";
import { getPaymentProvider } from "@/server/payments";
import { checkLimit, clientKey } from "@/server/rate-limit";
import { getSessionUser } from "@/server/session";
import { getStorage } from "@/server/storage";
import { type ActionState, toActionError } from "./result";

async function limit(scope: "cartPerClient" | "checkoutPerClient") {
  if (!(await checkLimit(scope, clientKey(await headers()))).ok) {
    throw new UserFacingError("Too many requests. Wait a minute, then try again.");
  }
}

export async function setCurrencyAction(formData: FormData) {
  const value = formData.get("currency");
  if (!isCurrency(value)) return;
  (await cookies()).set(CURRENCY_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.appUrl.startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  refresh();
}

export async function addToCartAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await limit("cartPerClient");
    const input = addToCartSchema.parse(Object.fromEntries(formData));
    const user = await getSessionUser();
    const cartId = await ensureCartId(user?.id ?? null, await getCurrency());
    await addToCart(cartId, {
      productId: input.productId,
      optionId: input.optionId,
      quantity: input.quantity,
      customisation: { printName: input.printName, printTitle: input.printTitle, artworkKey: input.artworkKey },
    });
    refresh();
    return { ok: true, message: "Added to your basket.", savedAt: Date.now() };
  } catch (error) {
    return toActionError(error);
  }
}

export async function uploadArtworkAction(formData: FormData): Promise<ActionState & { artworkKey?: string }> {
  try {
    await limit("cartPerClient");
    const file = formData.get("artwork");
    if (!(file instanceof File) || file.size === 0) throw new UserFacingError("Choose your logo file.", "artwork");
    const png = await processArtwork(Buffer.from(await file.arrayBuffer()));
    const key = `artwork/${crypto.randomUUID()}.png`;
    await getStorage().put(key, png, "image/png");
    return { ok: true, message: "Logo uploaded. We'll send you a proof to approve before printing.", artworkKey: key };
  } catch (error) {
    if (error instanceof ImageRejectedError) return { ok: false, message: error.message, fieldErrors: { artwork: error.message } };
    return toActionError(error);
  }
}

const itemId = z.string().min(1).max(64);

export async function updateQuantityAction(id: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await limit("cartPerClient");
    const cartId = await readCartId();
    if (!cartId) throw new UserFacingError("Your basket has expired. Add the items again.");
    await updateCartItemQuantity(cartId, itemId.parse(id), quantitySchema.parse(formData.get("quantity")));
    refresh();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function removeItemAction(id: string): Promise<ActionState> {
  try {
    await limit("cartPerClient");
    const cartId = await readCartId();
    if (cartId) await removeCartItem(cartId, itemId.parse(id));
    refresh();
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function checkoutAction(): Promise<ActionState> {
  let url: string;
  try {
    await limit("checkoutPerClient");
    const cartId = await readCartId();
    if (!cartId) throw new UserFacingError("Your basket is empty.");
    const user = await getSessionUser();
    ({ url } = await startCheckout({
      cartId,
      currency: await getCurrency(),
      user: user ? { id: user.id, email: user.email } : null,
      provider: getPaymentProvider(),
    }));
  } catch (error) {
    return toActionError(error);
  }
  redirect(url);
}
