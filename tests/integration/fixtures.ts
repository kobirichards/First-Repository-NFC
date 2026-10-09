import { db } from "@/db";
import { card, user } from "@/db/schema";
import { generateCardToken, generateClaimCode, hashClaimCode } from "@/server/cards/tokens";

export const SECRET = "itest-claim-secret";

export async function makeUser(name = "Test User") {
  const id = crypto.randomUUID();
  await db.insert(user).values({ id, name, email: `${id}@example.com`, emailVerified: true });
  return { id, name };
}

export async function makeUnclaimedCard() {
  const token = generateCardToken();
  const code = generateClaimCode();
  const [row] = await db.insert(card).values({ token, claimCodeHash: hashClaimCode(code, SECRET) }).returning();
  return { id: row.id, token, code };
}
