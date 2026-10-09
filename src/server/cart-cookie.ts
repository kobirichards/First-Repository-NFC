import "server-only";
import { cookies } from "next/headers";
import { env } from "@/config/env";
import { cartExists, createCart, isCartId } from "./cart";
import type { Currency } from "@/config/commerce";

export const CART_COOKIE = "cart_id";

export async function readCartId(): Promise<string | null> {
  const value = (await cookies()).get(CART_COOKIE)?.value;
  return isCartId(value) && (await cartExists(value)) ? value : null;
}

/** For server actions: returns the visitor's cart id, creating a cart (and cookie) if needed. */
export async function ensureCartId(userId: string | null, currency: Currency): Promise<string> {
  const existing = await readCartId();
  if (existing) return existing;
  const id = await createCart(userId, currency);
  (await cookies()).set(CART_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.appUrl.startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return id;
}
